/**
 * REVI Assets — Base de Datos
 * Usa node:sqlite — módulo NATIVO de Node.js 22+
 * Sin compilación, sin dependencias externas
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'REVI_ASSETS.db');
const db = new DatabaseSync(DB_PATH);

// Performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    usuario       TEXT NOT NULL,
    activo        INTEGER NOT NULL DEFAULT 1,
    fecha_creacion TEXT NOT NULL,
    fecha_ultima_login TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

  CREATE TABLE IF NOT EXISTS activos (
    id                TEXT PRIMARY KEY,
    codigo_nuevo      TEXT,
    codigo_antiguo    TEXT,
    raf               TEXT,
    nombre_equipo     TEXT NOT NULL,
    descripcion       TEXT,
    categoria         TEXT,
    centro_costo      TEXT NOT NULL,
    area              TEXT NOT NULL,
    linea_productiva  TEXT,
    periferico        TEXT,
    layout_ubicacion  TEXT,
    marca             TEXT,
    modelo            TEXT,
    anio              INTEGER,
    estado_equipo     TEXT NOT NULL DEFAULT 'USADO',
    responsable       TEXT,
    fecha_inventario  TEXT NOT NULL,
    observaciones     TEXT,
    fecha_registro    TEXT NOT NULL,
    usuario_registro  TEXT NOT NULL,
    fecha_ultima_mod  TEXT NOT NULL,
    validado          INTEGER NOT NULL DEFAULT 0,
    sync_pendiente    INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fotos (
    id          TEXT PRIMARY KEY,
    activo_id   TEXT NOT NULL,
    imagen_data TEXT NOT NULL,
    orden       INTEGER DEFAULT 0,
    fecha       TEXT NOT NULL,
    tipo        TEXT DEFAULT 'principal',
    FOREIGN KEY (activo_id) REFERENCES activos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS auditoria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    activo_id   TEXT,
    campo       TEXT,
    valor_prev  TEXT,
    valor_nuevo TEXT,
    usuario     TEXT,
    fecha       TEXT DEFAULT (datetime('now')),
    accion      TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_activos_centro ON activos(centro_costo);
  CREATE INDEX IF NOT EXISTS idx_activos_area   ON activos(area);
  CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado_equipo);
  CREATE INDEX IF NOT EXISTS idx_fotos_activo   ON fotos(activo_id);
  CREATE INDEX IF NOT EXISTS idx_audit_activo   ON auditoria(activo_id);
`);

console.log(`✅ Base de datos lista: ${DB_PATH}`);

module.exports = db;
