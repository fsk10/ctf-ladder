const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');
const { initDatabase } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'ctf-ladder-dev-secret';
const IS_PROD = process.env.NODE_ENV === 'production';

if (SESSION_SECRET === 'ctf-ladder-dev-secret' && IS_PROD) {
  console.error('FATAL: SESSION_SECRET env var must be set in production.');
  process.exit(1);
}

initDatabase();

// Trust Cloudflare / reverse proxy so req.ip gives the real visitor IP
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(session({
  store: new SqliteStore({ client: new Database(path.join(__dirname, 'db', 'ctf-ladder.db')) }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD   // HTTPS-only in production (Cloudflare handles TLS)
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Public page routes
app.get('/',           (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/week/:id',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'week.html')));
app.get('/player/:id', (_, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/match/:id',  (_, res) => res.sendFile(path.join(__dirname, 'public', 'match.html')));
app.get('/history',    (_, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));

// Admin page routes
app.get('/admin', (req, res) => res.redirect(req.session?.admin ? '/admin/dashboard' : '/admin/login'));
app.get('/admin/login',        (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html')));
app.get('/admin/dashboard',    (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html')));
app.get('/admin/import',       (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'import.html')));
app.get('/admin/players',      (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'players.html')));
app.get('/admin/weeks',        (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'weeks.html')));
app.get('/admin/seasons',      (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'seasons.html')));
app.get('/admin/settings',     (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'settings.html')));
app.get('/admin/security',     (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'security.html')));

// API routes
app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
if (process.env.ENABLE_TEST_DATA === 'true') {
  app.use('/api/test', require('./routes/test'));
}

app.listen(PORT, () => console.log(`CTF Ladder running at http://localhost:${PORT}`));
