const express = require('express');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/jugadores — todos los jugadores del sistema
router.get('/', verificarToken, (req, res) => {
  const { campeonato_id } = req.query;
  let sql = `
    SELECT j.id, j.nombre_completo, j.club, j.golpe_preferido, j.categoria,
           u.email,
           CASE WHEN j.usuario_id IS NOT NULL THEN 1 ELSE 0 END AS tiene_cuenta
    FROM jugadores j
    LEFT JOIN usuarios u ON u.id = j.usuario_id
  `;
  const params = [];
  if (campeonato_id) {
    sql += ` WHERE j.id IN (
      SELECT DISTINCT jugador1_id FROM partidos WHERE campeonato_id=? AND jugador1_id IS NOT NULL
      UNION
      SELECT DISTINCT jugador2_id FROM partidos WHERE campeonato_id=? AND jugador2_id IS NOT NULL
    )`;
    params.push(campeonato_id, campeonato_id);
  }
  sql += ' ORDER BY j.nombre_completo';
  res.json(query(sql, params));
});

// GET /api/jugadores/:id
router.get('/:id', verificarToken, (req, res) => {
  const j = query(`
    SELECT j.*, u.email,
           CASE WHEN j.usuario_id IS NOT NULL THEN 1 ELSE 0 END AS tiene_cuenta
    FROM jugadores j
    LEFT JOIN usuarios u ON u.id = j.usuario_id
    WHERE j.id = ?
  `, [req.params.id]);
  if (!j.length) return res.status(404).json({ error: 'Jugador no encontrado' });
  res.json(j[0]);
});

// ─── PUT /api/jugadores/:id — admin edita datos del jugador ─────────────────
router.put('/:id', verificarToken, soloAdmin, (req, res) => {
  const { club, golpe_preferido, categoria } = req.body;

  const GOLPES_VALIDOS = ['Drive', 'Back', 'Grulla', 'Mistsuki', '3D'];
  if (golpe_preferido && !GOLPES_VALIDOS.includes(golpe_preferido))
    return res.status(400).json({ error: 'Golpe preferido invalido' });

  const jugador = query('SELECT id FROM jugadores WHERE id = ?', [req.params.id]);
  if (!jugador.length)
    return res.status(404).json({ error: 'Jugador no encontrado' });

  run(
    'UPDATE jugadores SET club=?, golpe_preferido=?, categoria=? WHERE id=?',
    [club, golpe_preferido, categoria, req.params.id]
  );

  res.json({ mensaje: 'Jugador actualizado correctamente' });
});

module.exports = router;
