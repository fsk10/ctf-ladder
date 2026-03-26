const DEFAULT_SETTINGS = {
  overall_draw: 1,
  overall_win: 2,
  overall_winBy3: 3,
  overall_winBy5: 5,
  overall_loseBy5: -1,
  attacking_cap: 2,
  attacking_cover: 1,
  attacking_assist: 1,
  defending_return: 1,
  defending_flagKill: 1,
  defending_seal: 1,
  extra_cleanSheet: 2,
  min_matches: 0,
  participation_bonus_coefficient: 2.5
};

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM scoring_settings').all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

function getSeasonSettings(db, seasonId) {
  const settings = getSettings(db);
  const rows = db.prepare('SELECT key, value FROM season_scoring_settings WHERE season_id = ?').all(seasonId);
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

function calculateMatchPoints(stat, redScore, blueScore, settings) {
  const isRed = stat.team === 'Red';
  const teamScore = isRed ? redScore : blueScore;
  const opponentScore = isRed ? blueScore : redScore;

  let overallBonus = 0;
  if (redScore === blueScore) {
    overallBonus = settings.overall_draw;
  } else if ((isRed && redScore > blueScore) || (!isRed && blueScore > redScore)) {
    const margin = teamScore - opponentScore;
    if (margin >= 5) overallBonus = settings.overall_winBy5;
    else if (margin >= 3) overallBonus = settings.overall_winBy3;
    else overallBonus = settings.overall_win;
  } else {
    const margin = opponentScore - teamScore;
    overallBonus = margin >= 5 ? settings.overall_loseBy5 : 0;
  }

  const capPoints    = (stat.flag_capture || 0) * settings.attacking_cap;
  const coverPoints  = ((stat.flag_cover  || 0) / 3) * settings.attacking_cover;
  const assistPoints = (stat.flag_assist  || 0) * settings.attacking_assist;
  const returnPoints   = ((stat.flag_return || 0) / 5)  * settings.defending_return;
  const flagKillPoints = ((stat.flag_kill  || 0) / 10) * settings.defending_flagKill;
  const sealPoints     = (stat.flag_seal   || 0) * settings.defending_seal;
  const cleanSheet = opponentScore === 0 ? settings.extra_cleanSheet : 0;

  return overallBonus + capPoints + coverPoints + assistPoints
       + returnPoints + flagKillPoints + sealPoints + cleanSheet;
}

function getMatchBreakdown(stat, redScore, blueScore, settings) {
  const isRed = stat.team === 'Red';
  const teamScore = isRed ? redScore : blueScore;
  const opponentScore = isRed ? blueScore : redScore;

  let overallBonus = 0;
  let overallDesc = '';
  if (redScore === blueScore) {
    overallBonus = settings.overall_draw;
    overallDesc = 'Draw';
  } else if ((isRed && redScore > blueScore) || (!isRed && blueScore > redScore)) {
    const margin = teamScore - opponentScore;
    if (margin >= 5) { overallBonus = settings.overall_winBy5; overallDesc = `Win by ${margin} (≥5)`; }
    else if (margin >= 3) { overallBonus = settings.overall_winBy3; overallDesc = `Win by ${margin} (≥3)`; }
    else { overallBonus = settings.overall_win; overallDesc = `Win by ${margin}`; }
  } else {
    const margin = opponentScore - teamScore;
    if (margin >= 5) { overallBonus = settings.overall_loseBy5; overallDesc = `Loss by ${margin} (≥5)`; }
    else { overallBonus = 0; overallDesc = `Loss by ${margin}`; }
  }

  return {
    overall_bonus: overallBonus,
    overall_desc: overallDesc,
    cap_points:      (stat.flag_capture || 0) * settings.attacking_cap,
    cover_points:    ((stat.flag_cover  || 0) / 3) * settings.attacking_cover,
    assist_points:   (stat.flag_assist  || 0) * settings.attacking_assist,
    return_points:   ((stat.flag_return || 0) / 5)  * settings.defending_return,
    flag_kill_points:((stat.flag_kill   || 0) / 10) * settings.defending_flagKill,
    seal_points:     (stat.flag_seal    || 0) * settings.defending_seal,
    clean_sheet:     opponentScore === 0 ? settings.extra_cleanSheet : 0
  };
}

function calculateScore(totalPoints, pugsPlayed, coefficient = 2.5) {
  if (pugsPlayed === 0) return { avg_points_per_pug: 0, participation_bonus: 0, score: 0 };
  const avg = totalPoints / pugsPlayed;
  const bonus = coefficient * Math.sqrt(pugsPlayed);
  return { avg_points_per_pug: avg, participation_bonus: bonus, score: avg + bonus };
}

module.exports = { DEFAULT_SETTINGS, getSettings, getSeasonSettings, calculateMatchPoints, getMatchBreakdown, calculateScore };
