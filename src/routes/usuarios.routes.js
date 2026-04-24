const express = require('express');
const bcrypt  = require('bcryptjs');
const { query, run } = require('../db/database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios  — solo admin
router.get('/', verificarToken, soloAdmin, (req, res) => {
  const usuarios = query('SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY id');
  res.json(usuarios);
});

// POST /api/usuarios  — solo admin
router.post('/', verificarToken, soloAdmin, (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (!['admin','jugador'].includes(rol))
    return res.status(400).json({ error: 'Rol inválido' });

  const existe = query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe.length) return res.status(409).json({ error: 'Email ya registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const { lastID } = run(
    'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)',
    [nombre, email, hash, rol]
  );
  res.status(201).json({ id: lastID, nombre, email, rol });
});

// DELETE /api/usuarios/:id  — solo admin
router.delete('/:id', verificarToken, soloAdmin, (req, res) => {
  const { id } = req.params;
  const existe = query('SELECT id FROM usuarios WHERE id = ?', [id]);
  if (!existe.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  run('DELETE FROM usuarios WHERE id = ?', [id]);
  res.json({ mensaje: 'Usuario eliminado' });
});

module.exports = router;
