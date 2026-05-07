require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDB } = require('./src/db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./src/routes/auth.routes'));
app.use('/api/usuarios',    require('./src/routes/usuarios.routes'));
app.use('/api/jugadores',   require('./src/routes/jugadores.routes'));
app.use('/api/campeonatos', require('./src/routes/campeonatos.routes'));
app.use('/api/partidos',    require('./src/routes/partidos.routes'));
app.use('/api/importar',    require('./src/routes/importar.routes'));

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) =>
  res.json({ status: 'OK', proyecto: 'Front-On API', version: '2.0.0' })
);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ── Arranque ───────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Front-On API v2.0 corriendo en http://localhost:${PORT}`);
    console.log('');
    console.log('  AUTH:');
    console.log('  POST  /api/auth/login');
    console.log('  POST  /api/auth/registro');
    console.log('  GET   /api/auth/jugadores-lista');
    console.log('  GET   /api/auth/perfil');
    console.log('');
    console.log('  ADMIN:');
    console.log('  POST  /api/importar          ← subir plantilla Excel');
    console.log('  GET   /api/campeonatos');
    console.log('  GET   /api/partidos?campeonato_id=1');
    console.log('  PUT   /api/partidos/:id/resultado');
    console.log('');
    console.log('  JUGADOR:');
    console.log('  GET   /api/partidos/mis-partidos');
    console.log('  GET   /api/jugadores');
  });
}).catch(err => {
  console.error('❌ Error iniciando BD:', err);
  process.exit(1);
});
