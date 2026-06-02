const VIDEO_URL = 'https://www.youtube.com/watch?v=oKYIpmtlXIM';
const VIDEO_ID = 'oKYIpmtlXIM';
const THUMB_URL = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

function fixRecordLinks(){
  for (const card of document.querySelectorAll('.record-card')) {
    const text = card.textContent || '';
    if (!text.includes('46976') && !text.includes('46,976')) continue;
    const img = card.querySelector('.thumb img');
    if (img && !img.getAttribute('src')) img.src = THUMB_URL;
    const watch = card.querySelector('.watch.disabled');
    if (!watch) continue;
    const a = document.createElement('a');
    a.className = 'watch';
    a.href = VIDEO_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'YouTube';
    watch.replaceWith(a);
  }
}

const target = document.querySelector('#records');
if (target) new MutationObserver(fixRecordLinks).observe(target, { childList: true, subtree: true });
window.addEventListener('load', fixRecordLinks);
setTimeout(fixRecordLinks, 500);
