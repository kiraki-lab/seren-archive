(() => {
  function setReadableThemeLabel(){
    const btn = document.querySelector('#themeToggle');
    if (!btn) return;
    const isPink = document.body.classList.contains('theme-kiraki');
    btn.setAttribute('aria-label', isPink ? '현재 핑크모드, 하얀모드로 전환' : '현재 하얀모드, 핑크모드로 전환');
    btn.innerHTML = isPink
      ? '<span class="theme-toggle-main">현재: 핑크모드</span><small>하얀모드로 전환</small>'
      : '<span class="theme-toggle-main">현재: 하얀모드</span><small>핑크모드로 전환</small>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    setReadableThemeLabel();
    const observer = new MutationObserver(setReadableThemeLabel);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.querySelector('#themeToggle')?.addEventListener('click', () => {
      requestAnimationFrame(setReadableThemeLabel);
      setTimeout(setReadableThemeLabel, 60);
    });
  });
  window.addEventListener('load', setReadableThemeLabel);
})();
