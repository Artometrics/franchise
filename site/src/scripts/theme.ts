const root = document.documentElement;
const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement | null;
const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement | null;
const nav = document.getElementById('site-nav');

function syncTheme() {
  const light = root.getAttribute('data-theme') === 'light';
  themeBtn?.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  themeBtn?.setAttribute('aria-pressed', String(light));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f3ead7' : '#0e1110');
}

themeBtn?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('franchise-theme', next);
  } catch {
    /* private mode: the choice just will not persist */
  }
  syncTheme();
});
syncTheme();

if (menuBtn && nav) {
  menuBtn.hidden = false;
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}
