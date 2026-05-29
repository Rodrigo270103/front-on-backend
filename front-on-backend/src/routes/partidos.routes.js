const express = require('express');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/partidos?campeonato_id=1 ───────────────────────────────────────
router.get('/', verificarToken, (req, res) => {
  const { campeonato_id } = req.query;
  let sql = `
    SELECT p.*,
      j1.nombre_completo AS jugador1_nombre,
      j2.nombre_completo AS jugador2_nombre,
      jg.nombre_completo AS ganador_nombre
    FROM partidos p
    LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
    LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
    LEFT JOIN jugadores jg ON jg.id = p.ganador_id
  `;
  const params = [];
  if (campeonato_id) { sql += ' WHERE p.campeonato_id = ?'; params.push(campeonato_id); }
  sql += ' ORDER BY p.ronda, p.nro_partido';
  res.json(query(sql, params));
});

// ─── GET /api/partidos/mis-partidos — jugador ve sus propios partidos ────────
router.get('/mis-partidos', verificarToken, (req, res) => {
  const { jugador_id } = req.usuario;
  if (!jugador_id)
    return res.status(400).json({ error: 'No tienes un perfil de jugador vinculado' });

  const partidos = query(`
    SELECT p.*,
      j1.nombre_completo AS jugador1_nombre,
      j2.nombre_completo AS jugador2_nombre,
      jg.nombre_completo AS ganador_nombre,
      c.nombre AS campeonato_nombre
    FROM partidos p
    LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
    LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
    LEFT JOIN jugadores jg ON jg.id = p.ganador_id
    LEFT JOIN campeonatos c ON c.id = p.campeonato_id
    WHERE p.jugador1_id = ? OR p.jugador2_id = ?
    ORDER BY p.ronda, p.fecha, p.hora
  `, [jugador_id, jugador_id]);

  res.json(partidos);
});

// ─── GET /api/partidos/:id ───────────────────────────────────────────────────
router.get('/:id', verificarToken, (req, res) => {
  const p = query(`
    SELECT p.*,
      j1.nombre_completo AS jugador1_nombre,
      j2.nombre_completo AS jugador2_nombre,
      jg.nombre_completo AS ganador_nombre
    FROM partidos p
    LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
    LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
    LEFT JOIN jugadores jg ON jg.id = p.ganador_id
    WHERE p.id = ?
  `, [req.params.id]);
  if (!p.length) return res.status(404).json({ error: 'Partido no encontrado' });
  res.json(p[0]);
});

// ─── PUT /api/partidos/:id/resultado — admin registra scores y avanza bracket ─
router.put('/:id/resultado', verificarToken, soloAdmin, (req, res) => {
  const { sets } = req.body;
  if (!sets || !Array.isArray(sets) || sets.length < 2)
    return res.status(400).json({ error: 'Se requieren al menos 2 sets' });

  const partido = query('SELECT * FROM partidos WHERE id = ?', [req.params.id]);
  if (!partido.length) return res.status(404).json({ error: 'Partido no encontrado' });
  const p = partido[0];

  if (p.estado === 'finalizado')
    return res.status(400).json({ error: 'Este partido ya está finalizado' });

  // Calcular sets ganados
  let sets_j1 = 0, sets_j2 = 0;
  const setFields = {};
  sets.forEach((s, i) => {
    setFields[`set${i+1}_j1`] = s.j1;
    setFields[`set${i+1}_j2`] = s.j2;
    if (s.j1 > s.j2) sets_j1++;
    else sets_j2++;
  });

  // Final: mejor de 5 (necesita 3). Resto: mejor de 3 (necesita 2)
  const es_final = p.ronda?.toLowerCase() === 'final';
  const necesario = es_final ? 3 : 2;

  if (sets_j1 !== necesario && sets_j2 !== necesario)
    return res.status(400).json({ error: `Para esta ronda se necesitan ${necesario} sets ganados` });

  const ganador_id = sets_j1 > sets_j2 ? p.jugador1_id : p.jugador2_id;

  const setCols = Object.entries(setFields).map(([k]) => `${k}=?`).join(', ');
  const setVals = Object.values(setFields);

  run(
    `UPDATE partidos SET ${setCols}, sets_j1=?, sets_j2=?, estado='finalizado', ganador_id=? WHERE id=?`,
    [...setVals, sets_j1, sets_j2, ganador_id, req.params.id]
  );

  // Avance automatico del bracket usando partido_siguiente_id
  let proximoPartidoId = null;

  if (p.partido_siguiente_id) {
    const proxPartido = query('SELECT * FROM partidos WHERE id = ?', [p.partido_siguiente_id]);
    if (proxPartido.length) {
      proximoPartidoId = proxPartido[0].id;
      if (!proxPartido[0].jugador1_id) {
        run('UPDATE partidos SET jugador1_id = ? WHERE id = ?', [ganador_id, proximoPartidoId]);
      } else if (!proxPartido[0].jugador2_id) {
        run('UPDATE partidos SET jugador2_id = ? WHERE id = ?', [ganador_id, proximoPartidoId]);
      }
    }
  }

  const ganador = query('SELECT nombre_completo FROM jugadores WHERE id=?', [ganador_id]);

  res.json({
    mensaje: 'Resultado registrado',
    ganador: ganador[0]?.nombre_completo,
    sets_j1,
    sets_j2,
    proximo_partido_id: proximoPartidoId
  });
});

// ─── PUT /api/partidos/:id/programacion — admin edita fecha, hora, sede, cancha
router.put('/:id/programacion', verificarToken, soloAdmin, (req, res) => {
  const { fecha, hora, sede, cancha } = req.body;

  const partido = query('SELECT id FROM partidos WHERE id = ?', [req.params.id]);
  if (!partido.length)
    return res.status(404).json({ error: 'Partido no encontrado' });

  run(
    'UPDATE partidos SET fecha=?, hora=?, sede=?, cancha=? WHERE id=?',
    [fecha, hora, sede, cancha, req.params.id]
  );

  res.json({ mensaje: 'Programación actualizada correctamente' });
});

// ─── PUT /api/partidos/:id/estado — admin cambia estado del partido ──────────
router.put('/:id/estado', verificarToken, soloAdmin, (req, res) => {
  const { estado } = req.body;

  const ESTADOS_VALIDOS = ['programado', 'en_curso', 'finalizado'];
  if (!ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({ error: 'Estado inválido. Use: programado, en_curso o finalizado' });

  const partido = query('SELECT id FROM partidos WHERE id = ?', [req.params.id]);
  if (!partido.length)
    return res.status(404).json({ error: 'Partido no encontrado' });

  run('UPDATE partidos SET estado=? WHERE id=?', [estado, req.params.id]);

  res.json({ mensaje: `Estado actualizado a: ${estado}` });
});

module.exports = router;