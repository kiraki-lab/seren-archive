// 키라키 유챔 세렌 아카이브 - 커스텀 제보 폼 수신용 Web App
// 1) Apps Script 새 파일에 이 코드를 붙여넣기
// 2) SPREADSHEET_ID가 맞는지 확인
// 3) 배포 > 새 배포 > 웹 앱
// 4) 실행 사용자: 나, 액세스 권한: 모든 사용자
// 5) 발급된 /exec URL을 GitHub의 submit-config.js WEB_APP_URL에 입력

const SPREADSHEET_ID = '11CpZr5Z4mb-K_-DApqFTXqfuYXunoRkpbtOFzS-nMCw';
const SUBMISSIONS_SHEET = 'Submissions';

const SUBMISSION_HEADERS = [
  'submitted_at',
  'status',
  'youtube_url',
  'youtube_id',
  'thumbnail_url',
  'job',
  'boss_variant',
  'character_name',
  'server',
  'clear_hexa',
  'main_score',
  'score_type',
  'clear_date',
  'patch_version',
  'hexa_source',
  'clear_time_left',
  'clear_seconds_left',
  'memo',
  'is_main_candidate',
  'admin_note'
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'kiraki-seren-submit' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const sheet = getOrCreateSubmissionSheet_();
    const row = SUBMISSION_HEADERS.map(function (header) {
      if (header === 'status') return '검토중';
      if (header === 'score_type') return 'HEXA 환산';
      if (header === 'admin_note') return makeAdminNote_(payload);
      return payload[header] !== undefined ? payload[header] : '';
    });
    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSubmissionSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  if (!sheet) sheet = ss.insertSheet(SUBMISSIONS_SHEET);
  const firstRow = sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).getValues()[0];
  const needsHeader = firstRow.every(function (cell) { return cell === ''; });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function makeAdminNote_(payload) {
  const dateType = payload.patch_version || '';
  const mainText = payload.is_main_candidate ? '메인 후보' : '참고 후보';
  return [
    mainText,
    dateType,
    payload.boss_variant || '',
    payload.job || '',
    payload.character_name || '',
    payload.server || '',
    'HEXA ' + (payload.clear_hexa || ''),
    payload.clear_time_left ? payload.clear_time_left + ' 남김' : '',
    payload.memo || ''
  ].filter(Boolean).join(' / ');
}
