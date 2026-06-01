const JOBS = [
  '히어로','팔라딘','다크나이트','소마','미하일','블래스터','데몬슬레이어','데몬어벤져','아란','카이저','아델','제로',
  '보마','신궁','패스파인더','카인','윈드브레이커','메르세데스','와일드헌터','메카닉',
  '아크메이지(불독)','아크메이지(썬콜)','비숍','플레임위자드','루미너스','에반','배틀메이지','키네시스','일리움','라라','칼리','렌',
  '나이트로드','섀도어','듀얼블레이드','나이트워커','팬텀','카데나','호영',
  '바이퍼','캡틴','캐논슈터','스트라이커','은월','엔젤릭버스터','아크','제논'
];

const SUBMIT_WEB_APP_URL = window.KIRAKI_SUBMIT_WEB_APP_URL || (typeof WEB_APP_URL !== 'undefined' ? WEB_APP_URL : '');
const form = document.querySelector('#submissionForm');
const statusEl = document.querySelector('#submitStatus');
const noticeEl = document.querySelector('#configNotice');
const memo = form.querySelector('[name="memo"]');
const memoCount = document.querySelector('#memoCount');
const jobSelect = form.querySelector('[name="job"]');

jobSelect.innerHTML += JOBS.map(job => `<option value="${job}">${job}</option>`).join('');

memo.addEventListener('input', () => {
  memoCount.textContent = memo.value.length;
});

function getYouTubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) return match[1];
  }
  return '';
}

function secondsFromText(text) {
  const raw = String(text || '').trim();
  const sign = raw.includes('-') ? -1 : 1;
  const minuteMatch = raw.match(/(\d+)\s*분/);
  const secondMatch = raw.match(/(\d+)\s*초/);
  if (minuteMatch || secondMatch) {
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    const seconds = secondMatch ? Number(secondMatch[1]) : 0;
    return sign * (minutes * 60 + seconds);
  }
  const numeric = raw.replace(/[^0-9-]/g, '');
  return numeric ? Number(numeric) : '';
}

function buildPayload() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const youtubeId = getYouTubeId(data.youtube_url);
  const clearHexa = Number(String(data.clear_hexa || '').replace(/[^0-9]/g, ''));
  const clearSecondsLeft = secondsFromText(data.clear_time_left);
  return {
    ...data,
    youtube_id: youtubeId,
    thumbnail_url: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
    clear_hexa: clearHexa,
    main_score: clearHexa,
    score_type: 'HEXA 환산',
    clear_seconds_left: clearSecondsLeft,
    submitted_at: new Date().toISOString(),
    patch_version: data.clear_date >= '2026-03-19' ? '26년 3월 19일 패치 이후' : '26년 3월 19일 패치 이전',
    is_main_candidate: data.boss_variant === '유챔 세렌' && data.clear_date >= '2026-03-19'
  };
}

function buildGithubIssueUrl(payload) {
  const title = encodeURIComponent(`[제보] ${payload.job} / ${payload.character_name} / HEXA ${payload.clear_hexa}`);
  const body = encodeURIComponent(`## 기록 제보\n\n- 유튜브 URL: ${payload.youtube_url}\n- 직업: ${payload.job}\n- 보스 분류: ${payload.boss_variant}\n- 닉네임: ${payload.character_name}\n- 서버: ${payload.server}\n- HEXA 환산: ${payload.clear_hexa}\n- 클리어 날짜: ${payload.clear_date}\n- 남은 시간: ${payload.clear_time_left}\n- HEXA 확인 방식: ${payload.hexa_source}\n- 메모: ${payload.memo || ''}\n\n검수 후 public_records.csv에 반영해주세요.`);
  return `https://github.com/kiraki-lab/seren-archive/issues/new?title=${title}&body=${body}`;
}

if (SUBMIT_WEB_APP_URL) {
  noticeEl.classList.add('connected');
  noticeEl.innerHTML = '제출 서버가 연결되었습니다. 제보를 보내면 Google Sheets의 Submissions 시트에 저장되고, PD 검수 후 공개 기록에 반영됩니다.';
} else {
  noticeEl.innerHTML = '현재는 제출 서버 연결 전입니다. 입력 후 버튼을 누르면 GitHub 이슈 제보 화면이 열립니다. Apps Script 웹앱 URL을 연결하면 시트에 자동 저장됩니다.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = buildPayload();

  statusEl.className = 'submit-status';

  if (!payload.youtube_id) {
    statusEl.classList.add('error');
    statusEl.textContent = '유효한 유튜브 URL을 입력해주세요.';
    return;
  }

  statusEl.textContent = '제출 중...';

  if (!SUBMIT_WEB_APP_URL) {
    statusEl.textContent = 'GitHub 이슈 작성 화면을 여는 중입니다.';
    window.open(buildGithubIssueUrl(payload), '_blank', 'noopener');
    return;
  }

  try {
    await fetch(SUBMIT_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    statusEl.classList.add('ok');
    statusEl.textContent = '제보가 접수되었습니다. 검수 후 반영됩니다.';
    form.reset();
    memoCount.textContent = '0';
  } catch (error) {
    console.error(error);
    statusEl.classList.add('error');
    statusEl.textContent = '제출 실패. 잠시 후 다시 시도해주세요.';
  }
});
