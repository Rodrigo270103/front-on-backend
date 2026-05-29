const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../tmp/'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .xlsx'));
    }
  }
});

const RONDAS_VALIDAS      = new Set(['64avos','32avos','16avos','octavos','cuartos','semifinal','final']);
const RONDAS_SIN_JUGADORES = new Set(['16avos','octavos','cuartos','semifinal','final']);

// ─── POST /api/importar ──────────────────────────────────────────────────────
router.post('/', verificarToken, soloAdmin, upload.single('plantilla'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'No se recibio ningun archivo' });

  try {
    const wb   = XLSX.readFile(req.file.path);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // ── 2a. Limpiar datos anteriores ─────────────────────────────────────────
    run('DELETE FROM bracket');
    run('DELETE FROM partidos');
    run('DELETE FROM jugadores');
    run('DELETE FROM campeonatos');
    run("DELETE FROM sqlite_sequence WHERE name IN ('bracket','partidos','jugadores','campeonatos')");

    // ── 2b. Metadatos del campeonato ─────────────────────────────────────────
    const nombre    = String(filas[1]?.[1] || '').trim();
    const anio      = parseInt(filas[2]?.[1]) || new Date().getFullYear();
    const categoria = String(filas[3]?.[1] || '').trim();
    const sede      = String(filas[4]?.[1] || '').trim();

    if (!nombre || !categoria)
      return res.status(400).json({ error: 'El campeonato debe tener nombre y categoria' });

    // ── Insertar campeonato y obtener su ID ──────────────────────────────────
    const { lastID: campeonatoId } = run(
      'INSERT INTO campeonatos (nombre, anio, categoria, sede, estado) VALUES (?,?,?,?,?)',
      [nombre, anio, categoria, sede, 'en_curso']
    );

    // ── 2c/2d. Leer y filtrar filas de partidos ──────────────────────────────
    const partidosRaw = filas.slice(7).filter(f => {
      const nro   = String(f[0] || '').trim();
      const ronda = String(f[1] || '').trim().toLowerCase();
      return nro && RONDAS_VALIDAS.has(ronda);
    });

    if (!partidosRaw.length)
      return res.status(400).json({
        error: 'No se encontraron partidos validos. Verifique que la columna RONDA contenga: 64avos, 32avos, 16avos, octavos, cuartos, semifinal o final.'
      });

    // ── 2e. Extraer jugadores unicos y crearlos ──────────────────────────────
    const nombresUnicos = new Set();
    for (const f of partidosRaw) {
      const j1  = String(f[2] || '').trim();
      const j2  = String(f[3] || '').trim();
      const bye = String(f[4] || '').trim().toUpperCase();
      if (j1) nombresUnicos.add(j1);
      if (j2 && bye !== 'S') nombresUnicos.add(j2);
    }

    const mapaJugadores = {};
    for (const nombreJugador of nombresUnicos) {
      const existe = query('SELECT id FROM jugadores WHERE nombre_completo = ?', [nombreJugador]);
      if (existe.length) {
        mapaJugadores[nombreJugador] = existe[0].id;
      } else {
        const { lastID: jugadorId } = run('INSERT INTO jugadores (nombre_completo, categoria) VALUES (?,?)', [nombreJugador, categoria]);
        mapaJugadores[nombreJugador] = jugadorId;
      }
    }

    // ── 2f. PASO 1: Insertar todos los partidos, guardar mapa nro → id ───────
    const mapaPartidoId = {};
    let totalPartidos = 0;

    for (const f of partidosRaw) {
      const nro_partido = String(f[0]).trim();
      const ronda       = String(f[1]).trim().toLowerCase();
      const j1Nombre    = String(f[2] || '').trim();
      const j2Nombre    = String(f[3] || '').trim();
      const es_bye      = String(f[4] || '').trim().toUpperCase() === 'S' ? 1 : 0;
      const fecha       = String(f[5] || '').trim() || null;
      const hora        = String(f[6] || '').trim() || null;
      const sedePart    = String(f[7] || '').trim() || null;
      const cancha      = String(f[8] || '').trim() || null;

      // 2g: 16avos, octavos, cuartos, semifinal y final arrancan sin jugadores
      let jugador1_id = null;
      let jugador2_id = null;
      if (!RONDAS_SIN_JUGADORES.has(ronda)) {
        jugador1_id = mapaJugadores[j1Nombre] || null;
        jugador2_id = (!es_bye && j2Nombre) ? (mapaJugadores[j2Nombre] || null) : null;
      }

      const { lastID: partidoId } = run(
        `INSERT INTO partidos
           (campeonato_id, nro_partido, ronda, jugador1_id, jugador2_id,
            es_bye, fecha, hora, sede, cancha, estado, ganador_id, partido_siguiente_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [campeonatoId, nro_partido, ronda, jugador1_id, jugador2_id,
         es_bye, fecha, hora, sedePart, cancha, 'programado', null, null]
      );
      mapaPartidoId[nro_partido] = partidoId;
      totalPartidos++;
    }

    // ── 2f. PASO 2: Actualizar partido_siguiente_id usando el mapa ────────────
    for (const f of partidosRaw) {
      const nro       = String(f[0]).trim();
      const siguiente = String(f[9] || '').trim();
      if (siguiente && mapaPartidoId[nro] && mapaPartidoId[siguiente]) {
        run('UPDATE partidos SET partido_siguiente_id = ? WHERE id = ?',
          [mapaPartidoId[siguiente], mapaPartidoId[nro]]);
      }
    }

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      mensaje: 'Campeonato importado exitosamente',
      campeonato: nombre,
      partidos: totalPartidos,
      jugadores: nombresUnicos.size
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error importando:', err);
    res.status(500).json({ error: 'Error procesando la plantilla: ' + err.message });
  }
});

module.exports = router;
