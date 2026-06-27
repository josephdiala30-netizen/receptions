// ==================== KALYX SHARED UTILITIES ====================
// Loaded by all portals to eliminate code duplication.
// Keep portal-specific code in each index.html.

function getSession() {
  return window.__fbSession || (window.fbGetSession && fbGetSession()) || null;
}

function initTheme() {
  var theme = localStorage.getItem('theme') || 'light';
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    btn.textContent = 'light_mode';
  } else {
    btn.textContent = 'dark_mode';
  }
}

function toggleTheme() {
  var isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  var btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = isDark ? 'light_mode' : 'dark_mode';
}

function toggleUserMenu() {
  document.getElementById('userMenu').classList.toggle('hidden');
}

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str || '');
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getBaseUrl() {
  var p = window.location.pathname.replace(/\/?index\.html$/, '').replace(/\/$/, '');
  return p.substring(0, p.lastIndexOf('/') + 1);
}

function doLogout() {
  fbLogout(function() {
    window.location.href = getBaseUrl() + 'login/';
  });
}

function goTo(path) {
  window.location.href = getBaseUrl() + path;
}
