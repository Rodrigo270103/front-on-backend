const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../front_on.db');
let db;

async function getDB() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON;');
  return db;
}

function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

async function initDB() {
  await getDB();

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      rol        TEXT NOT NULL CHECK(rol IN ('admin','jugador')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS jugadores (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      usuario_id      INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
      club            TEXT,
      golpe_preferido TEXT CHECK(golpe_preferido IN ('derecha','zurda','ambidiestro')),
      categoria       TEXT
    );
    CREATE TABLE IF NOT EXISTS campeonatos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL,
      anio       INTEGER NOT NULL,
      categoria  TEXT NOT NULL,
      sede       TEXT,
      estado     TEXT NOT NULL CHECK(estado IN ('pendiente','en_curso','finalizado')) DEFAULT 'pendiente',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS partidos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      nro_partido   TEXT,
      ronda         TEXT NOT NULL,
      jugador1_id   INTEGER REFERENCES jugadores(id),
      jugador2_id   INTEGER REFERENCES jugadores(id),
      es_bye        INTEGER DEFAULT 0,
      fecha         TEXT,
      hora          TEXT,
      sede          TEXT,
      cancha        TEXT,
      set1_j1 INTEGER, set1_j2 INTEGER,
      set2_j1 INTEGER, set2_j2 INTEGER,
      set3_j1 INTEGER, set3_j2 INTEGER,
      set4_j1 INTEGER, set4_j2 INTEGER,
      set5_j1 INTEGER, set5_j2 INTEGER,
      sets_j1       INTEGER DEFAULT 0,
      sets_j2       INTEGER DEFAULT 0,
      estado        TEXT NOT NULL CHECK(estado IN ('programado','en_curso','finalizado')) DEFAULT 'programado',
      ganador_id    INTEGER REFERENCES jugadores(id),
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bracket (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      ronda         TEXT NOT NULL,
      posicion      INTEGER NOT NULL,
      partido_id    INTEGER REFERENCES partidos(id)
    );
  `);

  // Migración: eliminar CHECK constraint en golpe_preferido para admitir nuevos valores
  const jugSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='jugadores'");
  const jugSql = jugSchema[0]?.values[0]?.[0] ?? '';
  if (jugSql.toLowerCase().includes('check') && jugSql.includes('golpe_preferido')) {
    db.run('PRAGMA foreign_keys = OFF');
    db.run(`
      CREATE TABLE jugadores_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_completo TEXT NOT NULL,
        usuario_id      INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
        club            TEXT,
        golpe_preferido TEXT,
        categoria       TEXT
      )
    `);
    db.run('INSERT INTO jugadores_v2 SELECT id, nombre_completo, usuario_id, club, golpe_preferido, categoria FROM jugadores');
    db.run('DROP TABLE jugadores');
    db.run('ALTER TABLE jugadores_v2 RENAME TO jugadores');
    db.run('PRAGMA foreign_keys = ON');
    saveDB();
    console.log('Migracion aplicada: golpe_preferido sin restriccion CHECK');
  }

  const existe = db.exec("SELECT id FROM usuarios WHERE email='admin@fronton.pe'");
  if (!existe.length || !existe[0].values.length) {
    db.run("INSERT INTO usuarios (nombre,email,password,rol) VALUES (?,?,?,?)",
      ['Administrador', 'admin@fronton.pe', bcrypt.hashSync('admin123', 10), 'admin']);
    saveDB();
    console.log('✅ BD inicializada — admin creado');
  }
}

function query(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function run(sql, params = []) {
  db.run(sql, params);
  // Usar last_insert_rowid() inmediatamente después del INSERT
  const r = db.exec('SELECT last_insert_rowid() as id');
  const lastID = r[0]?.values[0][0] ?? 0;
  saveDB();
  return { lastID };
}

module.exports = { initDB, query, run, saveDB };
