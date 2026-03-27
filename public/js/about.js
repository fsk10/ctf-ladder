(function () {
  // Inject modal HTML into the page
  const el = document.createElement('div');
  el.innerHTML = `
<div class="modal-overlay" id="aboutModal" onclick="if(event.target===this)closeAbout()">
  <div class="modal">
    <button class="modal-close" onclick="closeAbout()">&#x2715;</button>
    <h2>About CTF Ladder</h2>
    <p>
      CTF Ladder is a seasonal pickup game (pug) competition for Unreal Tournament CTF.
      Each season consists of multiple weeks where players compete in matches tracked via UTStats.
    </p>
    <p>
      The scoring system is designed to <strong>reward participation and pure CTF teamwork</strong>:
      capping, returning, covering and sealing, rather than favoring highly skilled players
      who play infrequently. Scores are normalized per match played and combined with a
      participation bonus to encourage activity throughout the season.
    </p>

    <h3>Match Points</h3>
    <div id="aboutScoringTable"><p style="color:#999;font-size:.88rem">Loading...</p></div>

    <h3>Score Formula</h3>
    <div class="formula-box" id="aboutFormula">Loading...</div>
    <p id="aboutFormulaDesc"></p>

    <h3>Season Standings</h3>
    <p>
      Season standings aggregate all weeks (total points and total pugs played across the
      entire season) and apply the formula once on those totals.
      This means standings are <strong>not</strong> the sum of weekly scores.
    </p>
  </div>
</div>`;
  document.body.appendChild(el.querySelector('.modal-overlay'));

  let aboutSettings = null;

  window.openAbout = async function () {
    if (!aboutSettings) {
      aboutSettings = await (await fetch('/api/scoring-settings')).json();
      renderAbout(aboutSettings);
    }
    document.getElementById('aboutModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeAbout = function () {
    document.getElementById('aboutModal').classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeAbout();
  });

  function renderAbout(s) {
    const rows = [
      ['Result',    'Draw',                          '+' + s.overall_draw],
      ['Result',    'Win (margin 1-2)',               '+' + s.overall_win],
      ['Result',    'Win by \u22653 caps',            '+' + s.overall_winBy3],
      ['Result',    'Win by \u22655 caps',            '+' + s.overall_winBy5],
      ['Result',    'Loss by \u22655 caps',           '' + s.overall_loseBy5],
      ['Attacking', 'Per cap',                        '\xd7' + s.attacking_cap],
      ['Attacking', 'Per 3 covers (continuous)',      '\xd7' + s.attacking_cover],
      ['Attacking', 'Per assist',                     '\xd7' + s.attacking_assist],
      ['Defending', 'Per 5 returns (continuous)',     '\xd7' + s.defending_return],
      ['Defending', 'Per 10 flag kills (continuous)', '\xd7' + s.defending_flagKill],
      ['Defending', 'Per seal',                       '\xd7' + s.defending_seal],
      ['Extra',     'Clean sheet (opponent = 0 caps)','+' + s.extra_cleanSheet],
    ];

    let lastCat = '';
    const tableRows = rows.map(function ([cat, stat, pts]) {
      const catCell = cat !== lastCat
        ? '<td rowspan="' + rows.filter(function (r) { return r[0] === cat; }).length + '" style="font-weight:600;vertical-align:top;padding-top:.5rem">' + cat + '</td>'
        : '';
      if (cat !== lastCat) lastCat = cat;
      return '<tr>' + catCell + '<td>' + stat + '</td><td style="text-align:right;font-weight:600">' + pts + '</td></tr>';
    }).join('');

    document.getElementById('aboutScoringTable').innerHTML =
      '<table><thead><tr><th>Category</th><th>Stat</th><th style="text-align:right">Points</th></tr></thead><tbody>' + tableRows + '</tbody></table>';

    const coeff = s.participation_bonus_coefficient;
    document.getElementById('aboutFormula').textContent =
      'score = (total_points / pugs_played) + ' + coeff + ' \xd7 \u221a(pugs_played)';
    document.getElementById('aboutFormulaDesc').innerHTML =
      'The average points per pug normalizes for skill level, while the participation bonus' +
      ' (<strong>' + coeff + ' \xd7 \u221apugs</strong>) rewards players who keep showing up.' +
      ' The square root means each additional match gives slightly less bonus than the last,' +
      ' rewarding consistency without letting volume completely dominate.';
  }
})();
