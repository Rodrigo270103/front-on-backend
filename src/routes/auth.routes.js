const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, run } = require('../db/database');
const { verificarToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const usuarios = query('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!usuarios.length || !bcrypt.compareSync(password, usuarios[0].password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const u = usuarios[0];

  // Si es jugador, adjuntar datos de su perfil deportivo
  let jugador = null;
  if (u.rol === 'jugador') {
    const j = query('SELECT * FROM jugadores WHERE usuario_id = ?', [u.id]);
    jugador = j.length ? j[0] : null;
  }

  const token = jwt.sign(
    { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, jugador_id: jugador?.id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    mensaje: 'Login exitoso',
    token,
    usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol },
    jugador
  });
});

// ─── GET /api/auth/jugadores-lista — lista pública para el registro ──────────
// Sin token: el jugador busca su nombre antes de registrarse
router.get('/jugadores-lista', (req, res) => {
  const jugadores = query(`
    SELECT j.id, j.nombre_completo, j.categoria
    FROM jugadores j
    WHERE j.usuario_id IS NULL
    ORDER BY j.nombre_completo ASC
  `);
  res.json(jugadores);
});

// ─── POST /api/auth/registro — el jugador elige su nombre y crea su cuenta ───
router.post('/registro', (req, res) => {
  const { jugador_id, email, password, club, golpe_preferido } = req.body;

  if (!jugador_id || !email || !password || !club || !golpe_preferido)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  if (!['derecha','zurda','ambidiestro'].includes(golpe_preferido))
    return res.status(400).json({ error: 'Golpe preferido inválido' });

  // Verificar que el jugador existe y no tiene cuenta aún
  const jugadores = query('SELECT * FROM jugadores WHERE id = ?', [jugador_id]);
  if (!jugadores.length)
    return res.status(404).json({ error: 'Jugador no encontrado en el torneo' });

  if (jugadores[0].usuario_id)
    return res.status(409).json({ error: 'Este jugador ya tiene una cuenta registrada' });

  // Verificar email único
  const emailExiste = query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (emailExiste.length)
    return res.status(409).json({ error: 'Email ya registrado' });

  // Crear usuario
  const { lastID: usuarioId } = run(
    'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)',
    [jugadores[0].nombre_completo, email, bcrypt.hashSync(password, 10), 'jugador']
  );

  // Vincular jugador con usuario y actualizar club + golpe
  run(
    'UPDATE jugadores SET usuario_id=?, club=?, golpe_preferido=? WHERE id=?',
    [usuarioId, club, golpe_preferido, jugador_id]
  );

  res.status(201).json({
    mensaje: 'Cuenta creada exitosamente',
    usuario: { id: usuarioId, nombre: jugadores[0].nombre_completo, email, rol: 'jugador' }
  });
});

// ─── GET /api/auth/perfil ────────────────────────────────────────────────────
router.get('/perfil', verificarToken, (req, res) => {
  const u = query('SELECT id,nombre,email,rol,created_at FROM usuarios WHERE id=?', [req.usuario.id]);
  if (!u.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u[0]);
});

module.exports = router;
