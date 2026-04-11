const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { getSettings, getSeasonSettings, calculateScore, getMatchBreakdown } = require('../lib/scoring');

// Helper: returns { player_id -> [season_name, ...] } for all finished seasons
function getSeasonWinnerMap(db, coefficient = 2.5) {
  const finished = db.prepare("SELECT id, name FROM seasons WHERE status='finished'").all();
  const map = {};
  for (const s of finished) {
    const rows = db.prepare(`
      SELECT p.id AS player_id,
             COUNT(DISTINCT ms.match_id) AS pugs,
             COALESCE(SUM(ms.total_points), 0) AS pts
      FROM players p
      JOIN match_stats ms ON ms.player_id = p.id
      JOIN matches m ON m.id = ms.match_id
      JOIN weeks w ON w.id = m.week_id
      WHERE w.season_id = ? GROUP BY p.id
    `).all(s.id);
    if (!rows.length) continue;
    const winner = rows.map(r => ({ id: r.player_id, score: calculateScore(r.pts, r.pugs, coefficient).score }))
                       .sort((a, b) => b.score - a.score)[0];
    if (!map[winner.id]) map[winner.id] = [];
    map[winner.id].push(s.name);
  }
  return map;
}

// GET /api/standings?season_id=X  (defaults to active season)
router.get('/standings', (req, res) => {
  const db = getDb();
  const season = req.query.season_id
    ? db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.query.season_id)
    : db.prepare("SELECT * FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  if (!season) return res.json({ season: null, standings: [] });

  const settings = getSeasonSettings(db, season.id);
  const winners = getSeasonWinnerMap(db, settings.participation_bonus_coefficient);

  const rows = db.prepare(`
    SELECT p.id AS player_id, p.display_name,
           COUNT(DISTINCT ms.match_id) AS total_pugs,
           SUM(CASE WHEN m.red_score = m.blue_score THEN 1 ELSE 0 END) AS draws,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score > m.blue_score) OR (ms.team='Blue' AND m.blue_score > m.red_score) THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score - m.blue_score >= 3) OR (ms.team='Blue' AND m.blue_score - m.red_score >= 3) THEN 1 ELSE 0 END) AS wins_by3,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score - m.blue_score >= 5) OR (ms.team='Blue' AND m.blue_score - m.red_score >= 5) THEN 1 ELSE 0 END) AS wins_by5,
           SUM(CASE WHEN (ms.team='Red' AND m.blue_score - m.red_score >= 5) OR (ms.team='Blue' AND m.red_score - m.blue_score >= 5) THEN 1 ELSE 0 END) AS losses_by5,
           COALESCE(SUM(ms.flag_capture), 0) AS total_caps,
           COALESCE(SUM(ms.flag_assist), 0) AS total_assists,
           COALESCE(SUM(ms.flag_cover), 0) AS total_covers,
           COALESCE(SUM(ms.flag_kill), 0) AS total_kills,
           COALESCE(SUM(ms.flag_return), 0) AS total_returns,
           COALESCE(SUM(ms.flag_seal), 0) AS total_seals,
           SUM(CASE WHEN (ms.team='Red' AND m.blue_score = 0) OR (ms.team='Blue' AND m.red_score = 0) THEN 1 ELSE 0 END) AS clean_sheets,
           COALESCE(SUM(ms.total_points), 0) AS total_points
    FROM players p
    JOIN match_stats ms ON ms.player_id = p.id
    JOIN matches m ON m.id = ms.match_id
    JOIN weeks w ON w.id = m.week_id
    WHERE w.season_id = ?
    GROUP BY p.id
  `).all(season.id);

  const minMatches = Math.round(settings.min_matches || 0);

  const standings = rows.map(r => {
    const s = calculateScore(r.total_points, r.total_pugs, settings.participation_bonus_coefficient);
    return { ...r, ...s, season_wins: winners[r.player_id] || [] };
  }).sort((a, b) => b.score - a.score);

  // Compute rank history — cumulative rank after each week
  const allSeasonWeeks = db.prepare(
    'SELECT id, week_number FROM weeks WHERE season_id = ? ORDER BY week_number'
  ).all(season.id);

  if (allSeasonWeeks.length > 1) {
    const rankHistoryMap = {};
    for (let i = 0; i < allSeasonWeeks.length; i++) {
      const weekIds = allSeasonWeeks.slice(0, i + 1).map(w => w.id);
      const placeholders = weekIds.map(() => '?').join(',');
      const weekRows = db.prepare(`
        SELECT p.id AS player_id,
               COUNT(DISTINCT ms.match_id) AS total_pugs,
               COALESCE(SUM(ms.total_points), 0) AS total_points
        FROM players p
        JOIN match_stats ms ON ms.player_id = p.id
        JOIN matches m ON m.id = ms.match_id
        WHERE m.week_id IN (${placeholders})
        GROUP BY p.id
      `).all(...weekIds);
      const weekSorted = weekRows.map(r => {
        const s = calculateScore(r.total_points, r.total_pugs, settings.participation_bonus_coefficient);
        return { player_id: r.player_id, score: s.score };
      }).sort((a, b) => b.score - a.score);
      weekSorted.forEach((p, idx) => {
        if (!rankHistoryMap[p.player_id]) rankHistoryMap[p.player_id] = [];
        rankHistoryMap[p.player_id].push({ week: allSeasonWeeks[i].week_number, rank: idx + 1 });
      });
    }
    standings.forEach(p => { p.rank_history = rankHistoryMap[p.player_id] || []; });
  }

  // Compute rank changes relative to standings before the latest week
  const latestWeek = allSeasonWeeks.length
    ? allSeasonWeeks[allSeasonWeeks.length - 1]
    : null;

  if (latestWeek) {
    const prevRows = db.prepare(`
      SELECT p.id AS player_id,
             COUNT(DISTINCT ms.match_id) AS total_pugs,
             COALESCE(SUM(ms.total_points), 0) AS total_points
      FROM players p
      JOIN match_stats ms ON ms.player_id = p.id
      JOIN matches m ON m.id = ms.match_id
      JOIN weeks w ON w.id = m.week_id
      WHERE w.season_id = ? AND w.id != ?
      GROUP BY p.id
    `).all(season.id, latestWeek.id);

    if (prevRows.length > 0) {
      const prevSorted = prevRows.map(r => {
        const s = calculateScore(r.total_points, r.total_pugs, settings.participation_bonus_coefficient);
        return { player_id: r.player_id, score: s.score };
      }).sort((a, b) => b.score - a.score);

      const prevRankMap = {};
      prevSorted.forEach((p, i) => { prevRankMap[p.player_id] = i + 1; });

      standings.forEach((p, i) => {
        const prevRank = prevRankMap[p.player_id];
        p.rank_change = prevRank != null ? prevRank - (i + 1) : null; // positive = moved up
      });
    }
  }

  res.json({ season, standings, min_matches: minMatches });
});

// GET /api/seasons
router.get('/seasons', (req, res) => {
  const db = getDb();
  const seasons = db.prepare('SELECT * FROM seasons ORDER BY id DESC').all();
  res.json(seasons);
});

// GET /api/season-history  — finished seasons with top 3 per season
router.get('/season-history', (req, res) => {
  const db = getDb();
  const finished = db.prepare("SELECT * FROM seasons WHERE status='finished' ORDER BY id DESC").all();
  const history = finished.map(s => {
    const sSettings = getSeasonSettings(db, s.id);
    const rows = db.prepare(`
      SELECT p.id AS player_id, p.display_name,
             COUNT(DISTINCT ms.match_id) AS pugs,
             COALESCE(SUM(ms.total_points), 0) AS pts
      FROM players p
      JOIN match_stats ms ON ms.player_id = p.id
      JOIN matches m ON m.id = ms.match_id
      JOIN weeks w ON w.id = m.week_id
      WHERE w.season_id = ? GROUP BY p.id
    `).all(s.id);
    const top3 = rows.map(r => ({ ...r, ...calculateScore(r.pts, r.pugs, sSettings.participation_bonus_coefficient) }))
                     .sort((a, b) => b.score - a.score)
                     .slice(0, 3);
    return { ...s, top3 };
  });
  res.json(history);
});

// GET /api/season/:id/weeks
router.get('/season/:id/weeks', (req, res) => {
  const db = getDb();
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const weeks = db.prepare(`
    SELECT w.*, COUNT(m.id) AS match_count
    FROM weeks w LEFT JOIN matches m ON m.week_id = w.id
    WHERE w.season_id = ?
    GROUP BY w.id ORDER BY w.week_number
  `).all(season.id);

  res.json({ season, weeks });
});

// GET /api/week/:id
router.get('/week/:id', (req, res) => {
  const db = getDb();
  const week = db.prepare(`
    SELECT w.*, s.name AS season_name, s.id AS season_id
    FROM weeks w JOIN seasons s ON s.id = w.season_id
    WHERE w.id = ?
  `).get(req.params.id);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  const rows = db.prepare(`
    SELECT p.id AS player_id, p.display_name,
           COUNT(DISTINCT ms.match_id) AS pugs_played,
           SUM(CASE WHEN m.red_score = m.blue_score THEN 1 ELSE 0 END) AS draws,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score > m.blue_score) OR (ms.team='Blue' AND m.blue_score > m.red_score) THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score - m.blue_score >= 3) OR (ms.team='Blue' AND m.blue_score - m.red_score >= 3) THEN 1 ELSE 0 END) AS wins_by3,
           SUM(CASE WHEN (ms.team='Red' AND m.red_score - m.blue_score >= 5) OR (ms.team='Blue' AND m.blue_score - m.red_score >= 5) THEN 1 ELSE 0 END) AS wins_by5,
           SUM(CASE WHEN (ms.team='Red' AND m.blue_score - m.red_score >= 5) OR (ms.team='Blue' AND m.red_score - m.blue_score >= 5) THEN 1 ELSE 0 END) AS losses_by5,
           COALESCE(SUM(ms.flag_capture), 0) AS total_caps,
           COALESCE(SUM(ms.flag_assist), 0) AS total_assists,
           COALESCE(SUM(ms.flag_cover), 0) AS total_covers,
           COALESCE(SUM(ms.flag_kill), 0) AS total_kills,
           COALESCE(SUM(ms.flag_return), 0) AS total_returns,
           COALESCE(SUM(ms.flag_seal), 0) AS total_seals,
           SUM(CASE WHEN (ms.team='Red' AND m.blue_score = 0) OR (ms.team='Blue' AND m.red_score = 0) THEN 1 ELSE 0 END) AS clean_sheets,
           COALESCE(SUM(ms.total_points), 0) AS total_points
    FROM players p
    JOIN match_stats ms ON ms.player_id = p.id
    JOIN matches m ON m.id = ms.match_id
    WHERE m.week_id = ?
    GROUP BY p.id
  `).all(week.id);

  const settings = getSeasonSettings(db, week.season_id);
  const winners = getSeasonWinnerMap(db, settings.participation_bonus_coefficient);
  const standings = rows.map(r => {
    const s = calculateScore(r.total_points, r.pugs_played, settings.participation_bonus_coefficient);
    return { ...r, ...s, season_wins: winners[r.player_id] || [] };
  }).sort((a, b) => b.score - a.score);

  const matches = db.prepare("SELECT * FROM matches WHERE week_id = ? AND api_url NOT LIKE 'legacy://%' ORDER BY id").all(week.id);

  // Neighbour weeks for prev/next nav
  const allWeeks = db.prepare('SELECT id, week_number FROM weeks WHERE season_id = ? ORDER BY week_number').all(week.season_id);
  const idx = allWeeks.findIndex(w => w.id === week.id);
  const prev = idx > 0 ? allWeeks[idx - 1] : null;
  const next = idx < allWeeks.length - 1 ? allWeeks[idx + 1] : null;

  res.json({ week, standings, matches, prev, next });
});

// GET /api/player/:id
router.get('/player/:id', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const aliases = db.prepare('SELECT * FROM player_aliases WHERE player_id = ? ORDER BY last_seen DESC').all(player.id);

  // Season summaries (all seasons player has played)
  const seasonRows = db.prepare(`
    SELECT s.id AS season_id, s.name AS season_name, s.status,
           COUNT(DISTINCT ms.match_id) AS total_pugs,
           COALESCE(SUM(ms.total_points), 0) AS total_points
    FROM match_stats ms
    JOIN matches m ON m.id = ms.match_id
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    WHERE ms.player_id = ?
    GROUP BY s.id ORDER BY s.id DESC
  `).all(player.id);

  const seasonSummaries = seasonRows.map(r => {
    const sSettings = getSeasonSettings(db, r.season_id);
    const s = calculateScore(r.total_points, r.total_pugs, sSettings.participation_bonus_coefficient);
    // Compute rank within this season
    const others = db.prepare(`
      SELECT COUNT(DISTINCT ms2.match_id) AS pugs, COALESCE(SUM(ms2.total_points), 0) AS pts
      FROM players p2
      JOIN match_stats ms2 ON ms2.player_id = p2.id
      JOIN matches m2 ON m2.id = ms2.match_id
      JOIN weeks w2 ON w2.id = m2.week_id
      WHERE w2.season_id = ? AND p2.id != ?
      GROUP BY p2.id
    `).all(r.season_id, player.id);
    const rank = others.filter(o => calculateScore(o.pts, o.pugs, sSettings.participation_bonus_coefficient).score > s.score).length + 1;
    return { ...r, ...s, rank };
  });

  // Weekly history
  const weekRows = db.prepare(`
    SELECT w.id AS week_id, w.week_number, w.week_date,
           s.name AS season_name, s.id AS season_id,
           COUNT(DISTINCT ms.match_id) AS pugs_played,
           COALESCE(SUM(ms.total_points), 0) AS total_points
    FROM match_stats ms
    JOIN matches m ON m.id = ms.match_id
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    WHERE ms.player_id = ?
    GROUP BY w.id ORDER BY s.id DESC, w.week_number DESC
  `).all(player.id);

  const weeklyHistory = weekRows.map(r => {
    const sSettings = getSeasonSettings(db, r.season_id);
    const s = calculateScore(r.total_points, r.pugs_played, sSettings.participation_bonus_coefficient);
    return { ...r, ...s };
  });

  // Match history
  const matchHistory = db.prepare(`
    SELECT ms.match_id, ms.team, ms.alias_used, ms.total_points,
           ms.flag_capture, ms.flag_return, ms.flag_kill, ms.flag_cover,
           ms.flag_seal, ms.flag_assist,
           m.map, m.match_date, m.red_score, m.blue_score,
           w.week_number, w.id AS week_id, s.name AS season_name
    FROM match_stats ms
    JOIN matches m ON m.id = ms.match_id
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    WHERE ms.player_id = ? AND m.api_url NOT LIKE 'legacy://%'
    ORDER BY m.id DESC
  `).all(player.id);

  res.json({ player, aliases, seasonSummaries, weeklyHistory, matchHistory });
});

// GET /api/match/:id
router.get('/match/:id', (req, res) => {
  const db = getDb();
  const match = db.prepare(`
    SELECT m.*, w.week_number, w.id AS week_id, s.name AS season_name, s.id AS season_id
    FROM matches m
    JOIN weeks w ON w.id = m.week_id
    JOIN seasons s ON s.id = w.season_id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const settings = getSeasonSettings(db, match.season_id);

  const stats = db.prepare(`
    SELECT ms.*, p.display_name
    FROM match_stats ms JOIN players p ON p.id = ms.player_id
    WHERE ms.match_id = ?
    ORDER BY ms.team, ms.total_points DESC
  `).all(match.id);

  const statsWithBreakdown = stats.map(s => ({
    ...s,
    breakdown: getMatchBreakdown(s, match.red_score, match.blue_score, settings)
  }));

  const allInWeek = db.prepare('SELECT id FROM matches WHERE week_id = ? ORDER BY id').all(match.week_id);
  const idx = allInWeek.findIndex(m => m.id === match.id);
  const prevMatch = idx > 0 ? allInWeek[idx - 1] : null;
  const nextMatch = idx < allInWeek.length - 1 ? allInWeek[idx + 1] : null;

  res.json({ match, stats: statsWithBreakdown, prevMatch, nextMatch });
});

// GET /api/scoring-settings  (public, read-only)
router.get('/scoring-settings', (req, res) => {
  const db = getDb();
  const active = db.prepare("SELECT id FROM seasons WHERE status='active' ORDER BY id DESC LIMIT 1").get();
  res.json(active ? getSeasonSettings(db, active.id) : getSettings(db));
});

module.exports = router;
