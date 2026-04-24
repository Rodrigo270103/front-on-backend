const express = require('express');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/campeonatos
router.get('/', verificarToken, (req, res) => {
  res.json(query('SELECT * FROM campeonatos ORDER BY anio DESC'));
});

// GET /api/campeonatos/:id
router.get('/:id', verificarToken, (req, res) => {
  const camp = query('SELECT * FROM campeonatos WHERE id = ?', [req.params.id]);
  if (!camp.length) return res.status(404).json({ error: 'Campeonato no encontrado' });
  res.json(camp[0]);
});

// POST /api/campeonatos  — solo admin
router.post('/', verificarToken, soloAdmin, (req, res) => {
  const { nombre, anio, categoria, estado } = req.body;
  if (!nombre || !anio || !categoria)
    return res.status(400).json({ error: 'nombre, anio y categoria son requeridos' });

  const { lastID } = run(
    'INSERT INTO campeonatos (nombre, anio, categoria, estado) VALUES (?,?,?,?)',
    [nombre, anio, categoria, estado || 'pendiente']
  );
  res.status(201).json({ id: lastID, nombre, anio, categoria, estado: estado || 'pendiente' });
});

// PUT /api/campeonatos/:id  — solo admin
router.put('/:id', verificarToken, soloAdmin, (req, res) => {
  const { nombre, anio, categoria, estado } = req.body;
  const existe = query('SELECT id FROM campeonatos WHERE id = ?', [req.params.id]);
  if (!existe.length) return res.status(404).json({ error: 'Campeonato no encontrado' });

  run(
    'UPDATE campeonatos SET nombre=?, anio=?, categoria=?, estado=? WHERE id=?',
    [nombre, anio, categoria, estado, req.params.id]
  );
  res.json({ mensaje: 'Campeonato actualizado' });
});

// DELETE /api/campeonatos/:id  — solo admin
router.delete('/:id', verificarToken, soloAdmin, (req, res) => {
  const existe = query('SELECT id FROM campeonatos WHERE id = ?', [req.params.id]);
  if (!existe.length) return res.status(404).json({ error: 'Campeonato no encontrado' });
  run('DELETE FROM campeonatos WHERE id = ?', [req.params.id]);
  res.json({ mensaje: 'Campeonato eliminado' });
});

module.exports = router;
