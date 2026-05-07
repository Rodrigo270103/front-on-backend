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

// ─── POST /api/importar ──────────────────────────────────────────────────────
// Plantilla esperada:
//   Fila 2 col B → nombre campeonato
//   Fila 3 col B → año
//   Fila 4 col B → categoría
//   Fila 5 col B → sede
//   Fila 8 en adelante → partidos:
//     A=nro_partido, B=ronda, C=jugador1, D=jugador2,
//     E=bye(S/N),   F=fecha,  G=hora,    H=sede,  I=cancha
//
// LÓGICA DE BYES:
//   Un BYE significa que el jugador NO jugó la ronda anterior (ej: no jugó 64avos).
//   El partido queda con jugador1 asignado, jugador2 = NULL, estado = programado.
//   El jugador2 se asignará automáticamente cuando su rival gane su partido anterior.
router.post('/', verificarToken, soloAdmin, upload.single('plantilla'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'No se recibió ningún archivo' });

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // ── 1. Metadatos del campeonato (filas 2-5, índices 1-4, col B = índice 1)
    const nombre    = String(filas[1]?.[1] || '').trim();
    const anio      = parseInt(filas[2]?.[1]) || new Date().getFullYear();
    const categoria = String(filas[3]?.[1] || '').trim();
    const sede      = String(filas[4]?.[1] || '').trim();

    if (!nombre || !categoria)
      return res.status(400).json({ error: 'El campeonato debe tener nombre y categoría' });

    // ── 2. Crear campeonato
    const { lastID: campeonatoId } = run(
      'INSERT INTO campeonatos (nombre, anio, categoria, sede, estado) VALUES (?,?,?,?,?)',
      [nombre, anio, categoria, sede, 'en_curso']
    );

    // ── 3. Leer partidos desde fila 8 (índice 7)
    const RONDAS_VALIDAS = new Set([
      '64avos','32avos','16avos','octavos','cuartos','semifinal','final'
    ]);

    const filaInicio = 7;
    const partidosRaw = filas.slice(filaInicio).filter(f => {
      const nro   = String(f[0] || '').trim();
      const ronda = String(f[1] || '').trim().toLowerCase();
      return nro && RONDAS_VALIDAS.has(ronda);
    });

    if (!partidosRaw.length)
      return res.status(400).json({
        error: 'No se encontraron partidos válidos. Verifique que la columna RONDA tenga: 64avos, 32avos, 16avos, octavos, cuartos, semifinal o final.'
      });

    // ── 4. Extraer jugadores únicos y crearlos
    const nombresUnicos = new Set();
    for (const f of partidosRaw) {
      const j1  = String(f[2] || '').trim();
      const j2  = String(f[3] || '').trim();
      const bye = String(f[4] || '').trim().toUpperCase();
      if (j1) nombresUnicos.add(j1);
      if (j2 && bye !== 'S') nombresUnicos.add(j2);
    }

    const mapaJugadores = {};
    for (const nombre of nombresUnicos) {
      const existe = query('SELECT id FROM jugadores WHERE nombre_completo = ?', [nombre]);
      if (existe.length) {
        mapaJugadores[nombre] = existe[0].id;
      } else {
        const { lastID } = run(
          'INSERT INTO jugadores (nombre_completo, categoria) VALUES (?,?)',
          [nombre, categoria]
        );
        mapaJugadores[nombre] = lastID;
      }
    }

    // ── 5. Crear partidos y bracket
    // BYE = el jugador ya tiene su lugar en esta ronda, esperando al rival
    // Su partido queda programado con jugador1 asignado y jugador2 = NULL
    const contadorPosicion = {};
    const resumen = { campeonato_id: campeonatoId, jugadores: nombresUnicos.size, partidos: 0, byes: 0 };

    for (const f of partidosRaw) {
      const nro_partido = String(f[0]).trim();
      const ronda       = String(f[1]).trim().toLowerCase();
      const j1Nombre    = String(f[2] || '').trim();
      const j2Nombre    = String(f[3] || '').trim();
      const es_bye      = String(f[4] || '').trim().toUpperCase() === 'S' ? 1 : 0;
      const fecha       = String(f[5] || '').trim();
      const hora        = String(f[6] || '').trim();
      const sedePart    = String(f[7] || '').trim();
      const cancha      = String(f[8] || '').trim();

      const jugador1_id = mapaJugadores[j1Nombre] || null;
      // Si es BYE: jugador2 = NULL (llegará cuando su rival gane en la ronda anterior)
      const jugador2_id = (!es_bye && j2Nombre) ? (mapaJugadores[j2Nombre] || null) : null;

      if (!contadorPosicion[ronda]) contadorPosicion[ronda] = 0;
      contadorPosicion[ronda]++;
      const posicion = contadorPosicion[ronda];

      // BYE: el partido queda programado, jugador1 ya está, jugador2 llega después
      const { lastID: partidoId } = run(
        `INSERT INTO partidos
         (campeonato_id, nro_partido, ronda, jugador1_id, jugador2_id,
          es_bye, fecha, hora, sede, cancha, estado, ganador_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [campeonatoId, nro_partido, ronda, jugador1_id, jugador2_id,
         es_bye, fecha, hora, sedePart, cancha, 'programado', null]
      );

      run(
        'INSERT INTO bracket (campeonato_id, ronda, posicion, partido_id) VALUES (?,?,?,?)',
        [campeonatoId, ronda, posicion, partidoId]
      );

      resumen.partidos++;
      if (es_bye) resumen.byes++;
    }

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      mensaje: '✅ Campeonato importado exitosamente',
      ...resumen
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error importando:', err);
    res.status(500).json({ error: 'Error procesando la plantilla: ' + err.message });
  }
});

module.exports = router;