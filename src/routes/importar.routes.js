const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// Multer — guardar el Excel temporalmente en /tmp
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
// Body: multipart/form-data con el campo "plantilla" (archivo .xlsx)
router.post('/', verificarToken, soloAdmin, upload.single('plantilla'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'No se recibió ningún archivo' });

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // ── 1. Leer datos del campeonato (filas 5-8, col B = índice 1) ─────────
    const nombre   = String(filas[4]?.[1] || '').trim();
    const anio     = parseInt(filas[5]?.[1]) || new Date().getFullYear();
    const categoria= String(filas[6]?.[1] || '').trim();
    const sede     = String(filas[7]?.[1] || '').trim();

    if (!nombre || !categoria)
      return res.status(400).json({ error: 'El campeonato debe tener nombre y categoría' });

    // ── 2. Crear campeonato ─────────────────────────────────────────────────
    const { lastID: campeonatoId } = run(
      'INSERT INTO campeonatos (nombre, anio, categoria, sede, estado) VALUES (?,?,?,?,?)',
      [nombre, anio, categoria, sede, 'en_curso']
    );

    // ── 3. Leer partidos (desde fila 21, índice 20) ─────────────────────────
    // Columnas: A=nro, B=ronda, C=jugador1, D=jugador2, E=bye, F=fecha, G=hora, H=sede, I=cancha
    const filaInicio = 20; // índice 0-based de la fila 21
    const partidosRaw = filas.slice(filaInicio).filter(f =>
      f[0] && String(f[0]).trim().startsWith('P')
    );

    if (!partidosRaw.length)
      return res.status(400).json({ error: 'No se encontraron partidos en la plantilla' });

    // ── 4. Extraer jugadores únicos y crearlos ──────────────────────────────
    const nombresUnicos = new Set();
    for (const f of partidosRaw) {
      const j1 = String(f[2] || '').trim();
      const j2 = String(f[3] || '').trim();
      const bye = String(f[4] || '').trim().toUpperCase();
      if (j1) nombresUnicos.add(j1);
      if (j2 && bye !== 'S') nombresUnicos.add(j2);
    }

    // Crear jugadores que no existen aún
    const mapaJugadores = {}; // nombre → id
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

    // ── 5. Crear partidos y bracket ─────────────────────────────────────────
    // Mapeo de rondas → orden numérico para calcular posición en bracket
    const ordenRondas = {
      '64avos': 1, '32avos': 2, '16avos': 3,
      'octavos': 4, 'cuartos': 5, 'semifinal': 6, 'final': 7
    };

    // Contador de posición por ronda
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
      const jugador2_id = (!es_bye && j2Nombre) ? (mapaJugadores[j2Nombre] || null) : null;

      // Posición en el bracket
      if (!contadorPosicion[ronda]) contadorPosicion[ronda] = 0;
      contadorPosicion[ronda]++;
      const posicion = contadorPosicion[ronda];

      // Si es BYE: el partido queda finalizado y el jugador1 es el ganador automático
      const estadoPartido = es_bye ? 'finalizado' : 'programado';
      const ganador_id    = es_bye ? jugador1_id : null;

      const { lastID: partidoId } = run(
        `INSERT INTO partidos
         (campeonato_id, nro_partido, ronda, jugador1_id, jugador2_id,
          es_bye, fecha, hora, sede, cancha, estado, ganador_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [campeonatoId, nro_partido, ronda, jugador1_id, jugador2_id,
         es_bye, fecha, hora, sedePart, cancha, estadoPartido, ganador_id]
      );

      // Registrar en bracket
      run(
        'INSERT INTO bracket (campeonato_id, ronda, posicion, partido_id) VALUES (?,?,?,?)',
        [campeonatoId, ronda, posicion, partidoId]
      );

      resumen.partidos++;
      if (es_bye) resumen.byes++;
    }

    // ── 6. Avanzar BYEs automáticamente ────────────────────────────────────
    // Los jugadores con BYE ya tienen ganador_id, hay que colocarlos en la siguiente ronda
    const byePartidos = query(
      `SELECT * FROM partidos WHERE campeonato_id=? AND es_bye=1`, [campeonatoId]
    );

    for (const bp of byePartidos) {
      const posActual = query(
        'SELECT * FROM bracket WHERE partido_id=?', [bp.id]
      );
      if (!posActual.length) continue;

      const { ronda, posicion } = posActual[0];
      const posProxima = Math.ceil(posicion / 2);
      const rondaSig   = _siguienteRonda(ronda);

      // Buscar si ya existe partido en esa posición de la siguiente ronda
      const proxBracket = query(
        'SELECT * FROM bracket WHERE campeonato_id=? AND ronda=? AND posicion=?',
        [campeonatoId, rondaSig, posProxima]
      );

      if (proxBracket.length) {
        const proxP = query('SELECT * FROM partidos WHERE id=?', [proxBracket[0].partido_id]);
        if (proxP.length) {
          if (!proxP[0].jugador1_id) {
            run('UPDATE partidos SET jugador1_id=? WHERE id=?', [bp.ganador_id, proxP[0].id]);
          } else {
            run('UPDATE partidos SET jugador2_id=? WHERE id=?', [bp.ganador_id, proxP[0].id]);
          }
        }
      } else {
        // Crear slot en siguiente ronda
        const { lastID: nuevoId } = run(
          `INSERT INTO partidos (campeonato_id, ronda, jugador1_id, estado)
           VALUES (?,?,?,'programado')`,
          [campeonatoId, rondaSig, bp.ganador_id]
        );
        run(
          'INSERT INTO bracket (campeonato_id, ronda, posicion, partido_id) VALUES (?,?,?,?)',
          [campeonatoId, rondaSig, posProxima, nuevoId]
        );
      }
    }

    // Limpiar archivo temporal
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

function _siguienteRonda(ronda) {
  const orden = ['64avos','32avos','16avos','octavos','cuartos','semifinal','final'];
  const idx = orden.findIndex(r => ronda?.toLowerCase() === r);
  return idx >= 0 && idx < orden.length - 1 ? orden[idx + 1] : 'final';
}

module.exports = router;
