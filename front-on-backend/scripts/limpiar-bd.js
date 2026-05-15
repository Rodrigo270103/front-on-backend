/**
 * Script de limpieza de base de datos — ejecutar UNA sola vez.
 * Desde la carpeta front-on-backend/:  node scripts/limpiar-bd.js
 *
 * Hace:
 *  1. Resetea todos los partidos a estado 'programado' y borra resultados (sets, ganador)
 *  2. Pone club = NULL y golpe_preferido = NULL en todos los jugadores
 *  3. (Opcional comentado) Desvincula cuentas de jugadores para permitir re-registro
 */

const { initDB, run, query } = require('../src/db/database');

async function limpiar() {
  await initDB();

  // ── 1. PARTIDOS: resetear estado y borrar resultados ──────────────────────
  const antesPartidos = query("SELECT COUNT(*) AS n FROM partidos WHERE estado != 'programado'");
  const nPartidos = antesPartidos[0]?.n ?? 0;

  run(`
    UPDATE partidos SET
      estado     = 'programado',
      ganador_id = NULL,
      set1_j1 = NULL, set1_j2 = NULL,
      set2_j1 = NULL, set2_j2 = NULL,
      set3_j1 = NULL, set3_j2 = NULL,
      set4_j1 = NULL, set4_j2 = NULL,
      set5_j1 = NULL, set5_j2 = NULL,
      sets_j1 = 0,
      sets_j2 = 0
  `);
  console.log('Partidos reseteados: ' + nPartidos + ' con estado distinto de programado');

  // ── 2. JUGADORES: limpiar club y golpe_preferido ──────────────────────────
  const antesJugadores = query('SELECT COUNT(*) AS n FROM jugadores WHERE club IS NOT NULL OR golpe_preferido IS NOT NULL');
  const nJugadores = antesJugadores[0]?.n ?? 0;

  run('UPDATE jugadores SET club = NULL, golpe_preferido = NULL');
  console.log('Jugadores limpiados: ' + nJugadores + ' con club o golpe_preferido');

  // ── 3. Desvincular cuentas de jugadores para re-registro desde cero ───────
  run('UPDATE jugadores SET usuario_id = NULL');
  run("DELETE FROM usuarios WHERE rol = 'jugador'");
  console.log('Cuentas de jugadores eliminadas — pueden registrarse de nuevo');

  console.log('\nLimpieza completada.');
  console.log('Reinicia el servidor backend para que los cambios surtan efecto.');
  process.exit(0);
}

limpiar().catch(err => {
  console.error('Error durante la limpieza:', err.message);
  process.exit(1);
});
