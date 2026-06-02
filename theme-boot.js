(() => {
  const THEME_KEY = 'kirakiTheme';
  const USER_THEME_KEY = 'kirakiThemeUserSet';
  const savedTheme = localStorage.getItem(THEME_KEY);

  // Default mode is the readable white mode. If the visitor has not actively
  // chosen a theme in this version, start from clean mode.
  if (!localStorage.getItem(USER_THEME_KEY) || !['clean', 'kiraki'].includes(savedTheme || '')) {
    localStorage.setItem(THEME_KEY, 'clean');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('#themeToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      localStorage.setItem(USER_THEME_KEY, '1');
    }, { capture: true });
  });
})();
