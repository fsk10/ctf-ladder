# CTF Ladder

A web application for tracking Unreal Tournament CTF pickup game (pug) statistics across a season. Rather than presenting raw stats, the scoring system is designed to reward participation and pure CTF team skills — capping, returning, covering, sealing — over individual fraggers or high-skill players who play infrequently. Scores are normalized per match played and combined with a participation bonus to encourage activity throughout the season.

Replaces a Google Sheets document with a full-stack app that automates all score calculations.

## Features

- Import match data from UTStats JSON API
- Player alias management (handles nickname changes)
- Configurable scoring settings
- Public standings, weekly views, player pages and match breakdowns
- Admin area with session-based authentication

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via better-sqlite3
- **Frontend:** Vanilla HTML, CSS and JavaScript

## Setup

### Prerequisites

- Node.js 18+
- PM2 (recommended for production)

### Installation

```bash
git clone https://github.com/fsk10/ctf-ladder.git
cd ctf-ladder
npm install --omit=dev
```

### Configuration

Copy the example config and fill in your values:

```bash
cp ecosystem.config.js.example ecosystem.config.js
nano ecosystem.config.js
```

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Running

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Updating

```bash
git pull
npm install --omit=dev
pm2 restart ctfladder
```

## Scoring

### Match Points (per player, per match)

| Category | Stat | Points |
|---|---|---|
| Result | Draw | +1 |
| Result | Win | +2 |
| Result | Win by ≥3 caps | +3 |
| Result | Win by ≥5 caps | +5 |
| Result | Loss by ≥5 caps | −1 |
| Attacking | Per cap | ×2 |
| Attacking | Per 3 covers (continuous) | ×1 |
| Attacking | Per assist | ×1 |
| Defending | Per 5 returns (continuous) | ×1 |
| Defending | Per 10 flag kills (continuous) | ×1 |
| Defending | Per seal | ×1 |
| Extra | Clean sheet (opponent = 0 caps) | +2 |

All values are configurable in the admin settings panel.

### Weekly / Season Score

```
score = (total_points / pugs_played) + coefficient × √(pugs_played)
```

The participation bonus coefficient (default 2.5) is configurable in admin settings.

Season standings use aggregated totals across all weeks — not the sum of weekly scores.

## Admin

Default credentials (change before deploying):

- **Username:** `admin`
- **Password:** set via `ADMIN_PASS` in `ecosystem.config.js`
