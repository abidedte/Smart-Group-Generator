// app.js – View switching, theme toggle, initialisation

document.addEventListener('DOMContentLoaded', () => {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const html = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  const themeIcon = themeBtn.querySelector('.theme-icon');

  let dark = localStorage.getItem('sgg-theme') === 'dark';
  applyTheme(dark);

  themeBtn.addEventListener('click', () => {
    dark = !dark;
    applyTheme(dark);
    localStorage.setItem('sgg-theme', dark ? 'dark' : 'light');
  });

  function applyTheme(isDark) {
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
  }

  // ── Page Navigation ────────────────────────────────────────────────────────
  const pages = {
    landing: document.getElementById('landingPage'),
    smart: document.getElementById('smartGeneratePage'),
    spin: document.getElementById('spinPage'),
  };

  function showPage(name) {
    Object.entries(pages).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Landing → Smart Generate
  document.getElementById('goSmartGenerate').addEventListener('click', () => showPage('smart'));

  // Landing → Spin Mode
  document.getElementById('goSpin').addEventListener('click', () => showPage('spin'));

  // Back buttons
  document.getElementById('backFromSmart').addEventListener('click', () => showPage('landing'));
  document.getElementById('backFromSpin').addEventListener('click', () => showPage('landing'));

  // ── Error shake animation (CSS) ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes errorShake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);

  // ── Initialise Modules ─────────────────────────────────────────────────────
  initSmartGenerate();
  initSpinMode();
});
