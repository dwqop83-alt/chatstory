// Database module for ChatStory - uses sql.js (SQLite compiled to JS/WASM)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'chatstory.db');

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  initSchema();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      version INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Load full app state
async function loadState() {
  const d = await getDb();
  const stmt = d.prepare('SELECT data, version FROM app_state WHERE id = 1');
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return { data: JSON.parse(row.data), version: row.version };
  }
  stmt.free();
  return null;
}

// Save full app state
async function saveState(data) {
  const d = await getDb();
  const json = JSON.stringify(data);
  d.run(`
    INSERT INTO app_state (id, data, version, updated_at)
    VALUES (1, ?, COALESCE((SELECT version FROM app_state WHERE id = 1), 0) + 1, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      version = excluded.version,
      updated_at = excluded.updated_at;
  `, [json]);
  saveDb();
}

// Get database file path
function getDbPath() {
  return DB_PATH;
}

// Get database file as Buffer
function getDbBuffer() {
  if (fs.existsSync(DB_PATH)) {
    return fs.readFileSync(DB_PATH);
  }
  return null;
}

// Restore database from Buffer
function restoreDb(buffer) {
  if (db) db.close();
  fs.writeFileSync(DB_PATH, buffer);
  db = null; // Will be recreated on next getDb()
  return true;
}

// Close database
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, loadState, saveState, getDbPath, getDbBuffer, restoreDb, closeDb };