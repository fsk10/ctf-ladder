const express = require('express');
const router  = express.Router();
const path    = require('path');
const crypto  = require('crypto');
const { getDb } = require('../db/database');
const { getSettings, getSeasonSettings, calculateMatchPoints, DEFAULT_SETTINGS } = require('../lib/scoring');

const DB_PATH    = path.join(__dirname, '..', 'db', 'ctf-ladder.db');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_FAILS      = 5;

// Timing-safe string comparison to prevent timing attacks
function safeEqual(a, b) {
  try {
    return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch { return false; }
}

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const db = getDb();
  const ip = req.headers['cf-connecting-ip'] || req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limit: block if too many recent failures from this IP
  const { count: recentFails } = db.prepare(`
    SELECT COUNT(*) AS count FROM login_attempts
    WHERE ip = ? AND success = 0
    AND attempted_at > datetime('now', ?)
  `).get(ip, `-${RATE_LIMIT_WINDOW_MINUTES} minutes`);

  if (recentFails >= RATE_LIMIT_MAX_FAILS) {
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.` });
  }

  const { username = '', password = '', remember = false } = req.body;
  const success = safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASS);

  db.prepare('INSERT INTO login_attempts (ip, success) VALUES (?, ?)').run(ip, success ? 1 : 0);

  if (success) {
    req.session.admin = true;
    if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/admin/auth
router.get('/auth', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.admin) });
});

// ===== SEASONS =====

router.get('/seasons', requireAuth, (req, res) => {
  const db = getDb();
  const seasons = db.prepare(`
    SELECT s.*, COUNT(DISTINCT w.id) AS week_count, COUNT(DISTINCT m.id) AS match_count,
           COUNT(DISTINCT ms.player_id) AS player_count
    FROM seasons s
    LEFT JOIN weeks w ON w.season_id = s.id
    LEFT JOIN matches m ON m.week_id = w.id
    LEFT JOIN match_stats ms ON ms.match_id = m.id
    GROUP BY s.id ORDER BY s.id DESC
  `).all();
  res.json(seasons);
});

router.post('/seasons', requireAuth, (req, res) => {
  const db = getDb();
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const r = db.prepare('INSERT INTO seasons (name) VALUES (?)').run(name.trim());
    const seasonId = r.lastInsertRowid;
    // Copy current global settings as this season's settings
    const currentSettings = getSettings(db);
    const upsert = db.prepare('INSERT OR REPLACE INTO season_scoring_settings (season_id, key, value) VALUES (?, ?, ?)');
    db.transaction(() => {
      for (const [k, v] of Object.entries(currentSettings)) {
        if (k in DEFAULT_SETTINGS) upsert.run(seasonId, k, v);
      }
    })();
    res.json(db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/seasons/:id', requireAuth, (req, res) => {
  const db = getDb();
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!season) return res.status(404).json({ error: 'Season not found' });
  const { status, name } = req.body;
  if (status) {
    if (status === 'active') {
      db.prepare("UPDATE seasons SET status = 'finished', ended_at = datetime('now') WHERE status = 'active' AND id != ?").run(season.id);
      db.prepare("UPDATE seasons SET status = 'active', ended_at = NULL WHERE id = ?").run(season.id);
    } else if (status === 'finished') {
      db.prepare("UPDATE seasons SET status = 'finished', ended_at = datetime('now') WHERE id = ?").run(season.id);
    }
  }
  if (name?.trim()) db.prepare('UPDATE seasons SET name = ? WHERE id = ?').run(name.trim(), season.id);
  res.json(db.prepare('SELECT * FROM seasons WHERE id = ?').get(season.id));
});

router.delete('/seasons/:id', requireAuth, (req, res) => {
  const db = getDb();
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!season) return res.status(404).json({ error: 'Season not found' });
  db.prepare('DELETE FROM seasons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/recent-matches
router.get('/recent-matches', requireAuth, (req, res) => {
  const db = getDb();
  const matches = db.prepare(`
    SELECT m.id, m.map, m.red_score, m.blue_score, m.imported_at,
           w.week_number, w.id AS week_id, s.name AS season_name
    FROM matches m
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    ORDER BY m.id DESC
    LIMIT 8
  `).all();
  res.json(matches);
});

// ===== WEEKS =====

router.get('/weeks', requireAuth, (req, res) => {
  const db = getDb();
  const { season_id } = req.query;
  let sql = `
    SELECT w.*, s.name AS season_name, COUNT(m.id) AS match_count
    FROM weeks w JOIN seasons s ON s.id = w.season_id
    LEFT JOIN matches m ON m.week_id = w.id
  `;
  const params = [];
  if (season_id) { sql += ' WHERE w.season_id = ?'; params.push(season_id); }
  sql += ' GROUP BY w.id ORDER BY s.id DESC, w.week_number DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/weeks', requireAuth, (req, res) => {
  const db = getDb();
  const { season_id, week_number, week_date } = req.body;
  if (!season_id || !week_number) return res.status(400).json({ error: 'season_id and week_number required' });
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(season_id);
  if (!season) return res.status(404).json({ error: 'Season not found' });
  if (season.status !== 'active') return res.status(400).json({ error: 'Season is not active' });
  try {
    const r = db.prepare('INSERT INTO weeks (season_id, week_number, week_date) VALUES (?, ?, ?)').run(season_id, week_number, week_date || null);
    res.json(db.prepare('SELECT * FROM weeks WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Week number already exists for this season' });
    res.status(400).json({ error: e.message });
  }
});

router.put('/weeks/:id', requireAuth, (req, res) => {
  const db = getDb();
  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id);
  if (!week) return res.status(404).json({ error: 'Week not found' });
  const { week_number, week_date } = req.body;
  try {
    if (week_number !== undefined) db.prepare('UPDATE weeks SET week_number = ? WHERE id = ?').run(parseInt(week_number), week.id);
    if (week_date !== undefined)   db.prepare('UPDATE weeks SET week_date = ? WHERE id = ?').run(week_date || null, week.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Week number already exists for this season' });
    return res.status(400).json({ error: e.message });
  }
  res.json(db.prepare('SELECT * FROM weeks WHERE id = ?').get(week.id));
});

router.delete('/weeks/:id', requireAuth, (req, res) => {
  const db = getDb();
  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id);
  if (!week) return res.status(404).json({ error: 'Week not found' });
  db.prepare('DELETE FROM weeks WHERE id = ?').run(week.id);
  res.json({ success: true });
});

// ===== MATCHES =====

router.get('/matches', requireAuth, (req, res) => {
  const db = getDb();
  const { week_id } = req.query;
  let sql = `
    SELECT m.*, w.week_number, s.name AS season_name, COUNT(ms.id) AS player_count
    FROM matches m
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    LEFT JOIN match_stats ms ON ms.match_id = m.id
  `;
  const params = [];
  if (week_id) { sql += ' WHERE m.week_id = ?'; params.push(week_id); }
  sql += ' GROUP BY m.id ORDER BY m.match_date DESC, m.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.put('/matches/:id', requireAuth, (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  const { map, server, match_date, game_type } = req.body;
  db.prepare('UPDATE matches SET map = ?, server = ?, match_date = ?, game_type = ? WHERE id = ?')
    .run(
      map        !== undefined ? map        : match.map,
      server     !== undefined ? server     : match.server,
      match_date !== undefined ? match_date : match.match_date,
      game_type  !== undefined ? game_type  : match.game_type,
      match.id
    );
  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id));
});

router.delete('/matches/:id', requireAuth, (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  db.prepare('DELETE FROM matches WHERE id = ?').run(match.id);
  res.json({ success: true });
});

// ===== IMPORT FLOW =====

// POST /api/admin/fetch-match-data  — fetch from UTStats and resolve aliases
router.post('/fetch-match-data', requireAuth, async (req, res) => {
  const db = getDb();
  const { url } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'URL required' });

  const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

  const existing = db.prepare('SELECT id FROM matches WHERE api_url = ?').get(normalizedUrl);
  if (existing) return res.status(400).json({ error: 'This match has already been imported' });

  let matchData;
  try {
    const response = await fetch(normalizedUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    matchData = await response.json();
  } catch (e) {
    return res.status(400).json({ error: `Could not fetch match data: ${e.message}` });
  }

  if (matchData.redTeamScore === undefined || matchData.blueTeamScore === undefined) {
    return res.status(400).json({ error: 'Invalid match data: missing team scores' });
  }

  const players = (matchData.players || []).filter(p => !p.spectator && !p.bot);

  const settings = getSettings(db);

  const resolved = players.map(p => {
    const aliasRow = db.prepare(`
      SELECT pa.player_id, pl.display_name
      FROM player_aliases pa JOIN players pl ON pl.id = pa.player_id
      WHERE pa.alias = ? COLLATE NOCASE
    `).get(p.name);

    const stats = {
      flag_capture: p.flagCapture || 0,
      flag_return:  p.flagReturn  || 0,
      flag_kill:    p.flagKill    || 0,
      flag_cover:   p.flagCover   || 0,
      flag_seal:    p.flagSeal    || 0,
      flag_assist:  p.flagAssist  || 0,
      flag_pickup:  p.flagPickup  || 0,
      flag_taken:   p.flagTaken   || 0,
      flag_drop:    p.flagDrop    || 0
    };

    const preview_points = calculateMatchPoints(
      { ...stats, team: p.team || 'Red' },
      matchData.redTeamScore, matchData.blueTeamScore, settings
    );

    return {
      name: p.name,
      team: p.team || 'Red',
      stats,
      preview_points,
      resolved_player_id:    aliasRow ? aliasRow.player_id    : null,
      resolved_display_name: aliasRow ? aliasRow.display_name : null
    };
  });

  const allPlayers = db.prepare('SELECT id, display_name FROM players ORDER BY display_name COLLATE NOCASE').all();

  res.json({
    url: normalizedUrl,
    matchInfo: {
      red_score:  matchData.redTeamScore,
      blue_score: matchData.blueTeamScore,
      map:        matchData.map       || matchData.mapName      || null,
      game_type:  matchData.gameType  || matchData.gametypeName || null,
      server:     matchData.server    || matchData.serverName   || null,
      match_date: matchData.date      || null
    },
    players: resolved,
    allPlayers
  });
});

// POST /api/admin/import-match  — confirm and save
router.post('/import-match', requireAuth, (req, res) => {
  const db = getDb();
  const { week_id, url, matchInfo, players } = req.body;
  if (!week_id || !url || !matchInfo || !players) return res.status(400).json({ error: 'Missing required fields' });

  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(week_id);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  for (const p of players) {
    if (!p.player_id && !p.new_player_name?.trim()) {
      return res.status(400).json({ error: `Player "${p.name}" is not resolved` });
    }
  }

  const settings = getSettings(db);

  const doImport = db.transaction(() => {
    const matchResult = db.prepare(`
      INSERT INTO matches (week_id, api_url, map, game_type, server, match_date, red_score, blue_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(week_id, url.trim(), matchInfo.map, matchInfo.game_type, matchInfo.server, matchInfo.match_date, matchInfo.red_score, matchInfo.blue_score);

    const matchId = matchResult.lastInsertRowid;

    for (const p of players) {
      let playerId = p.player_id;

      if (!playerId) {
        const r = db.prepare('INSERT INTO players (display_name) VALUES (?)').run(p.new_player_name.trim());
        playerId = r.lastInsertRowid;
      }

      const existingAlias = db.prepare('SELECT id FROM player_aliases WHERE alias = ? COLLATE NOCASE').get(p.name);
      if (!existingAlias) {
        db.prepare('INSERT INTO player_aliases (player_id, alias) VALUES (?, ?)').run(playerId, p.name);
      } else {
        db.prepare("UPDATE player_aliases SET last_seen = datetime('now') WHERE id = ?").run(existingAlias.id);
      }

      const totalPoints = calculateMatchPoints({ ...p.stats, team: p.team }, matchInfo.red_score, matchInfo.blue_score, settings);

      db.prepare(`
        INSERT INTO match_stats
          (match_id, player_id, alias_used, team,
           flag_capture, flag_return, flag_kill, flag_cover,
           flag_seal, flag_assist, flag_pickup, flag_taken, flag_drop, total_points)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(matchId, playerId, p.name, p.team,
        p.stats.flag_capture, p.stats.flag_return, p.stats.flag_kill, p.stats.flag_cover,
        p.stats.flag_seal,    p.stats.flag_assist, p.stats.flag_pickup, p.stats.flag_taken,
        p.stats.flag_drop,    totalPoints
      );
    }
    return matchId;
  });

  try {
    const matchId = doImport();
    res.json({ success: true, match_id: matchId });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'This match has already been imported' });
    res.status(500).json({ error: e.message });
  }
});

// ===== PLAYERS =====

router.get('/players', requireAuth, (req, res) => {
  const db = getDb();
  const players = db.prepare(`
    SELECT p.*, COUNT(DISTINCT ms.match_id) AS match_count
    FROM players p
    LEFT JOIN match_stats ms ON ms.player_id = p.id
    GROUP BY p.id
    ORDER BY p.display_name COLLATE NOCASE
  `).all();
  const aliases = db.prepare('SELECT * FROM player_aliases ORDER BY player_id, last_seen DESC').all();
  res.json(players.map(p => ({ ...p, aliases: aliases.filter(a => a.player_id === p.id) })));
});

router.post('/players', requireAuth, (req, res) => {
  const db = getDb();
  const { display_name } = req.body;
  if (!display_name?.trim()) return res.status(400).json({ error: 'display_name required' });
  try {
    const r = db.prepare('INSERT INTO players (display_name) VALUES (?)').run(display_name.trim());
    res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Display name already exists' });
    res.status(400).json({ error: e.message });
  }
});

router.delete('/players/:id', requireAuth, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const { matches } = db.prepare('SELECT COUNT(*) AS matches FROM match_stats WHERE player_id = ?').get(req.params.id);
  if (matches > 0) return res.status(400).json({ error: 'Cannot delete player with match data' });
  db.prepare('DELETE FROM player_aliases WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/players/:id', requireAuth, (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const { display_name } = req.body;
  if (!display_name?.trim()) return res.status(400).json({ error: 'display_name required' });
  try {
    db.prepare('UPDATE players SET display_name = ? WHERE id = ?').run(display_name.trim(), player.id);
    res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Display name already exists' });
    res.status(400).json({ error: e.message });
  }
});

router.delete('/players/:id/aliases/:aliasId', requireAuth, (req, res) => {
  const db = getDb();
  const alias = db.prepare('SELECT * FROM player_aliases WHERE id = ? AND player_id = ?').get(req.params.aliasId, req.params.id);
  if (!alias) return res.status(404).json({ error: 'Alias not found' });

  db.transaction(() => {
    db.prepare('DELETE FROM player_aliases WHERE id = ?').run(alias.id);
    const { remaining } = db.prepare('SELECT COUNT(*) AS remaining FROM player_aliases WHERE player_id = ?').get(req.params.id);
    const { matches } = db.prepare('SELECT COUNT(*) AS matches FROM match_stats WHERE player_id = ?').get(req.params.id);
    if (remaining === 0 && matches === 0) {
      db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
    }
  })();

  res.json({ success: true });
});

// POST /api/admin/players/:id/aliases/:aliasId/split
// Creates a new player from an alias, moves all match_stats with that alias_used to the new player
router.post('/players/:id/aliases/:aliasId/split', requireAuth, (req, res) => {
  const db = getDb();
  const alias = db.prepare('SELECT * FROM player_aliases WHERE id = ? AND player_id = ?').get(req.params.aliasId, req.params.id);
  if (!alias) return res.status(404).json({ error: 'Alias not found' });

  db.transaction(() => {
    // If a player with this name already exists, reuse it instead of creating a new one
    let existing = db.prepare('SELECT id FROM players WHERE display_name = ? COLLATE NOCASE').get(alias.alias);
    const targetId = existing
      ? existing.id
      : db.prepare('INSERT INTO players (display_name) VALUES (?)').run(alias.alias).lastInsertRowid;

    db.prepare('UPDATE match_stats SET player_id = ? WHERE player_id = ? AND alias_used = ? COLLATE NOCASE').run(targetId, req.params.id, alias.alias);
    db.prepare('UPDATE player_aliases SET player_id = ? WHERE id = ?').run(targetId, alias.id);

    // Clean up original player if now empty
    const { remaining } = db.prepare('SELECT COUNT(*) AS remaining FROM player_aliases WHERE player_id = ?').get(req.params.id);
    const { matches } = db.prepare('SELECT COUNT(*) AS matches FROM match_stats WHERE player_id = ?').get(req.params.id);
    if (remaining === 0 && matches === 0) {
      db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
    }
  })();

  res.json({ success: true });
});

router.post('/players/merge', requireAuth, (req, res) => {
  const db = getDb();
  const { source_id, target_id } = req.body;
  if (!source_id || !target_id || source_id == target_id) return res.status(400).json({ error: 'Invalid merge request' });
  const source = db.prepare('SELECT * FROM players WHERE id = ?').get(source_id);
  const target = db.prepare('SELECT * FROM players WHERE id = ?').get(target_id);
  if (!source || !target) return res.status(404).json({ error: 'Player not found' });

  db.transaction(() => {
    db.prepare('UPDATE match_stats SET player_id = ? WHERE player_id = ?').run(target_id, source_id);
    db.prepare('UPDATE player_aliases SET player_id = ? WHERE player_id = ?').run(target_id, source_id);
    db.prepare('DELETE FROM players WHERE id = ?').run(source_id);
  })();

  res.json({ success: true, target: db.prepare('SELECT * FROM players WHERE id = ?').get(target_id) });
});

// ===== SCORING SETTINGS =====

router.get('/scoring-settings', requireAuth, (req, res) => {
  const db = getDb();
  const active = db.prepare("SELECT id FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  res.json(active ? getSeasonSettings(db, active.id) : getSettings(db));
});

router.post('/scoring-settings', requireAuth, (req, res) => {
  const db = getDb();
  const active = db.prepare("SELECT id FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  const upsertGlobal = db.prepare('INSERT OR REPLACE INTO scoring_settings (key, value) VALUES (?, ?)');
  const upsertSeason = active
    ? db.prepare('INSERT OR REPLACE INTO season_scoring_settings (season_id, key, value) VALUES (?, ?, ?)')
    : null;
  db.transaction(() => {
    for (const [k, v] of Object.entries(req.body)) {
      if (k in DEFAULT_SETTINGS) {
        upsertGlobal.run(k, parseFloat(v));
        if (upsertSeason) upsertSeason.run(active.id, k, parseFloat(v));
      }
    }
  })();
  res.json(active ? getSeasonSettings(db, active.id) : getSettings(db));
});

// POST /api/admin/recalculate-points — only recalculates the active season
router.post('/recalculate-points', requireAuth, (req, res) => {
  const db = getDb();
  const active = db.prepare("SELECT id FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  if (!active) return res.status(400).json({ error: 'No active season to recalculate.' });
  const settings = getSeasonSettings(db, active.id);
  const matches = db.prepare(`
    SELECT m.* FROM matches m
    JOIN weeks w ON w.id = m.week_id
    WHERE w.season_id = ?
  `).all(active.id);
  const updateStat = db.prepare('UPDATE match_stats SET total_points = ? WHERE id = ?');
  let updated = 0;
  db.transaction(() => {
    for (const match of matches) {
      const stats = db.prepare('SELECT * FROM match_stats WHERE match_id = ?').all(match.id);
      for (const stat of stats) {
        const points = calculateMatchPoints(stat, match.red_score, match.blue_score, settings);
        updateStat.run(points, stat.id);
        updated++;
      }
    }
  })();
  res.json({ success: true, updated });
});

router.post('/scoring-settings/reset', requireAuth, (req, res) => {
  const db = getDb();
  const active = db.prepare("SELECT id FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  const upsertGlobal = db.prepare('INSERT OR REPLACE INTO scoring_settings (key, value) VALUES (?, ?)');
  const upsertSeason = active
    ? db.prepare('INSERT OR REPLACE INTO season_scoring_settings (season_id, key, value) VALUES (?, ?, ?)')
    : null;
  db.transaction(() => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      upsertGlobal.run(k, v);
      if (upsertSeason) upsertSeason.run(active.id, k, v);
    }
  })();
  res.json(active ? getSeasonSettings(db, active.id) : getSettings(db));
});

// GET /api/admin/login-attempts
router.get('/login-attempts', requireAuth, (req, res) => {
  const db = getDb();

  // IPs with 3+ failed attempts in the last 7 days (suspicious)
  const suspicious = db.prepare(`
    SELECT ip,
           COUNT(*) AS failed_attempts,
           MAX(attempted_at) AS last_attempt,
           MIN(attempted_at) AS first_attempt
    FROM login_attempts
    WHERE success = 0 AND attempted_at > datetime('now', '-7 days')
    GROUP BY ip
    HAVING failed_attempts >= 3
    ORDER BY last_attempt DESC
  `).all();

  // Last 100 failed attempts in detail
  const recent = db.prepare(`
    SELECT id, ip, attempted_at
    FROM login_attempts
    WHERE success = 0
    ORDER BY attempted_at DESC
    LIMIT 100
  `).all();

  // Count of failed attempts in last 24h (for dashboard badge)
  const { count: last24h } = db.prepare(`
    SELECT COUNT(*) AS count FROM login_attempts
    WHERE success = 0 AND attempted_at > datetime('now', '-24 hours')
  `).get();

  res.json({ suspicious, recent, last24h });
});

// DELETE /api/admin/login-attempts  — purge logs older than 30 days
router.delete('/login-attempts', requireAuth, (req, res) => {
  const db = getDb();
  const { changes } = db.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-30 days')").run();
  res.json({ deleted: changes });
});

// DELETE /api/admin/wipe  — delete all match data (seasons, weeks, matches, stats, players)
router.delete('/wipe', requireAuth, (req, res) => {
  const db = getDb();
  db.transaction(() => {
    db.exec('DELETE FROM match_stats');
    db.exec('DELETE FROM matches');
    db.exec('DELETE FROM weeks');
    db.exec('DELETE FROM season_scoring_settings');
    db.exec('DELETE FROM seasons');
    db.exec('DELETE FROM player_aliases');
    db.exec('DELETE FROM players');
  })();
  res.json({ ok: true });
});

// GET /api/admin/backup  — download a consistent hot backup of the SQLite database
router.get('/backup', requireAuth, (req, res) => {
  const db  = getDb();
  const fs  = require('fs');
  const os  = require('os');
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `ctf-ladder-backup-${ts}.db`;
  const destPath = path.join(os.tmpdir(), filename);
  // better-sqlite3 backup() gives a consistent snapshot safe for WAL mode
  db.backup(destPath)
    .then(() => {
      res.download(destPath, filename, () => {
        fs.unlink(destPath, () => {});
      });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
