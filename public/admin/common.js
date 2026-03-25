// Highlight active nav link and apply wide layout for admin
(function () {
  const path = window.location.pathname;
  document.querySelectorAll('nav a[href]').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
  document.body.classList.add('full-stats');
})();

async function checkAuth() {
  const r = await fetch('/api/admin/auth');
  const d = await r.json();
  if (!d.authenticated) window.location.href = '/admin/login';
}

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
}
