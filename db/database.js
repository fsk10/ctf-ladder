const Database = require('better-sqlite3');
const path = require('path');
const { DEFAULT_SETTINGS } = require('../lib/scoring');

const DB_PATH = path.join(__dirname, 'sunday-ladder.db');
let db;

function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL UNIQUE,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_aliases (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      alias      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weeks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id   INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      week_date   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(season_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      api_url     TEXT NOT NULL UNIQUE,
      map         TEXT,
      game_type   TEXT,
      server      TEXT,
      match_date  TEXT,
      red_score   INTEGER NOT NULL DEFAULT 0,
      blue_score  INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS match_stats (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id     INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id    INTEGER NOT NULL REFERENCES players(id),
      alias_used   TEXT NOT NULL,
      team         TEXT NOT NULL CHECK(team IN ('Red','Blue')),
      flag_capture INTEGER NOT NULL DEFAULT 0,
      flag_return  INTEGER NOT NULL DEFAULT 0,
      flag_kill    INTEGER NOT NULL DEFAULT 0,
      flag_cover   INTEGER NOT NULL DEFAULT 0,
      flag_seal    INTEGER NOT NULL DEFAULT 0,
      flag_assist  INTEGER NOT NULL DEFAULT 0,
      flag_pickup  INTEGER NOT NULL DEFAULT 0,
      flag_taken   INTEGER NOT NULL DEFAULT 0,
      flag_drop    INTEGER NOT NULL DEFAULT 0,
      total_points REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scoring_settings (
      key   TEXT PRIMARY KEY,
      value REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ip           TEXT NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      success      INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts (ip, attempted_at);
  `);

  const insert = db.prepare('INSERT OR IGNORE INTO scoring_settings (key, value) VALUES (?, ?)');
  const seed = db.transaction(() => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, v);
  });
  seed();

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDatabase, getDb };
