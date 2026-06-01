// 키라키 유챔 세렌 아카이브 - 제보 승인 자동화
// 목적: Submissions 시트에서 approve 체크박스를 TRUE로 체크하면 Public_Records 시트에 자동 등록합니다.
// 사용법:
// 1. 기존 제보 WebApp Apps Script 프로젝트에 이 코드를 새 파일로 붙여넣기
// 2. setupApprovalWorkflow() 함수를 1회 실행
// 3. 권한 승인
// 4. 이후 Submissions 시트의 approve 체크박스를 체크하면 자동 반영

const APPROVAL_SPREADSHEET_ID = '11CpZr5Z4mb-K_-DApqFTXqfuYXunoRkpbtOFzS-nMCw';
const SUBMISSIONS_TAB = 'Submissions';
const PUBLIC_TAB = 'Public_Records';

const PUBLIC_HEADERS = [
  'id','approved','status','boss_variant','job','character_name','server','clear_hexa','main_score','score_type',
  'youtube_url','youtube_id','thumbnail_url','clear_date','patch_version','hexa_confirmed','hexa_source',
  'clear_time_left','clear_seconds_left','is_main_record','reference_only','admin_note'
];

const SUBMISSION_EXTRA_HEADERS = ['approve','approved_at','public_record_id'];

function setupApprovalWorkflow() {
  const ss = SpreadsheetApp.openById(APPROVAL_SPREADSHEET_ID);
  const submissions = ss.getSheetByName(SUBMISSIONS_TAB);
  if (!submissions) throw new Error('Submissions 시트를 찾을 수 없습니다.');

  ensureHeaders_(submissions, SUBMISSION_EXTRA_HEADERS);
  const subHeaders = getHeaders_(submissions);
  const approveCol = subHeaders.indexOf('approve') + 1;
  const maxRows = Math.max(submissions.getMaxRows() - 1, 1);
  submissions.getRange(2, approveCol, maxRows, 1).insertCheckboxes();

  let publicSheet = ss.getSheetByName(PUBLIC_TAB);
  if (!publicSheet) publicSheet = ss.insertSheet(PUBLIC_TAB);
  const firstRow = publicSheet.getRange(1, 1, 1, PUBLIC_HEADERS.length).getValues()[0];
  const needsHeader = firstRow.every(function (cell) { return cell === ''; });
  if (needsHeader) {
    publicSheet.getRange(1, 1, 1, PUBLIC_HEADERS.length).setValues([PUBLIC_HEADERS]);
    publicSheet.setFrozenRows(1);
  }

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'handleSubmissionApprovalEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('handleSubmissionApprovalEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert('승인 자동화 설정 완료: Submissions 시트의 approve 체크박스를 체크하면 Public_Records에 자동 등록됩니다.');
}

function handleSubmissionApprovalEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SUBMISSIONS_TAB) return;
  if (e.range.getRow() === 1) return;

  const headers = getHeaders_(sheet);
  const editedHeader = headers[e.range.getColumn() - 1];
  if (editedHeader !== 'approve') return;
  if (String(e.value).toUpperCase() !== 'TRUE') return;

  const rowValues = sheet.getRange(e.range.getRow(), 1, 1, headers.length).getValues()[0];
  const submission = rowToObject_(headers, rowValues);
  if (submission.public_record_id) return;

  const ss = SpreadsheetApp.openById(APPROVAL_SPREADSHEET_ID);
  const publicSheet = ss.getSheetByName(PUBLIC_TAB);
  const publicHeaders = getHeaders_(publicSheet);

  const existingRow = findExistingPublicRow_(publicSheet, publicHeaders, submission.youtube_id, submission.youtube_url);
  const recordId = existingRow ? getCellByHeader_(publicSheet, publicHeaders, existingRow, 'id') : makeNextRecordId_(publicSheet, publicHeaders);
  const publicRecord = buildPublicRecord_(submission, recordId);
  const outputRow = publicHeaders.map(function (header) { return publicRecord[header] !== undefined ? publicRecord[header] : ''; });

  if (existingRow) {
    publicSheet.getRange(existingRow, 1, 1, publicHeaders.length).setValues([outputRow]);
  } else {
    publicSheet.appendRow(outputRow);
  }

  setByHeader_(sheet, headers, e.range.getRow(), 'status', '승인완료');
  setByHeader_(sheet, headers, e.range.getRow(), 'approved_at', new Date());
  setByHeader_(sheet, headers, e.range.getRow(), 'public_record_id', recordId);
}

function buildPublicRecord_(s, recordId) {
  const clearDate = normalizeDate_(s.clear_date);
  const isAfterSerenPatch = clearDate >= '2026-03-19';
  const bossVariantRaw = s.boss_variant || '유챔 세렌';
  const isDirectUChamp = bossVariantRaw === '유챔 세렌';
  const isMain = isDirectUChamp && isAfterSerenPatch && Number(s.clear_seconds_left || 0) >= 0;
  const referenceOnly = !isMain;
  let bossVariant = bossVariantRaw;

  if (!isAfterSerenPatch && isDirectUChamp) bossVariant = '패치 이전 유챔 세렌 참고';
  if (Number(s.clear_seconds_left || 0) < 0) bossVariant = '하드 세렌 기반 유챔 참고';

  const clearHexa = Number(String(s.clear_hexa || s.main_score || '').replace(/[^0-9]/g, ''));
  const youtubeId = s.youtube_id || getYouTubeId_(s.youtube_url);
  const thumbnailUrl = s.thumbnail_url || (youtubeId ? 'https://img.youtube.com/vi/' + youtubeId + '/hqdefault.jpg' : '');
  const timeText = s.clear_time_left || secondsToText_(Number(s.clear_seconds_left || 0));

  return {
    id: recordId,
    approved: true,
    status: '검증완료',
    boss_variant: bossVariant,
    job: s.job,
    character_name: s.character_name,
    server: s.server,
    clear_hexa: clearHexa,
    main_score: clearHexa,
    score_type: 'HEXA 환산',
    youtube_url: s.youtube_url,
    youtube_id: youtubeId,
    thumbnail_url: thumbnailUrl,
    clear_date: clearDate,
    patch_version: isAfterSerenPatch ? '26년 3월 19일 패치 이후' : '26년 3월 19일 패치 이전',
    hexa_confirmed: s.hexa_source && s.hexa_source !== '확인 필요',
    hexa_source: s.hexa_source || '사용자 제보',
    clear_time_left: timeText,
    clear_seconds_left: s.clear_seconds_left,
    is_main_record: isMain,
    reference_only: referenceOnly,
    admin_note: makePublicAdminNote_(s, clearHexa, bossVariant, isMain)
  };
}

function makePublicAdminNote_(s, clearHexa, bossVariant, isMain) {
  const statusText = isMain ? '패치 이후 유챔 세렌 직접 클리어' : bossVariant;
  return [
    statusText,
    'HEXA ' + Number(clearHexa).toLocaleString('ko-KR'),
    '닉네임 ' + (s.character_name || ''),
    '서버 ' + (s.server || ''),
    s.job || '',
    s.clear_time_left ? s.clear_time_left + ' 남기고 클리어' : '',
    s.memo || ''
  ].filter(Boolean).join('. ') + '.';
}

function ensureHeaders_(sheet, headersToAdd) {
  const headers = getHeaders_(sheet);
  headersToAdd.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function (h) { return String(h).trim(); });
}

function rowToObject_(headers, rowValues) {
  const obj = {};
  headers.forEach(function (header, index) { obj[header] = rowValues[index]; });
  return obj;
}

function findExistingPublicRow_(sheet, headers, youtubeId, youtubeUrl) {
  const idCol = headers.indexOf('youtube_id') + 1;
  const urlCol = headers.indexOf('youtube_url') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (youtubeId && row[idCol - 1] === youtubeId) return i + 2;
    if (youtubeUrl && row[urlCol - 1] === youtubeUrl) return i + 2;
  }
  return 0;
}

function makeNextRecordId_(sheet, headers) {
  const idCol = headers.indexOf('id') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'REC-001';
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues().flat();
  const maxNum = ids.reduce(function (max, id) {
    const match = String(id).match(/REC-(\d+)/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return 'REC-' + String(maxNum + 1).padStart(3, '0');
}

function getCellByHeader_(sheet, headers, row, header) {
  const col = headers.indexOf(header) + 1;
  return col > 0 ? sheet.getRange(row, col).getValue() : '';
}

function setByHeader_(sheet, headers, row, header, value) {
  const col = headers.indexOf(header) + 1;
  if (col > 0) sheet.getRange(row, col).setValue(value);
}

function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '').replace(/\./g, '-').replace(/\s+/g, '').replace(/-$/,'');
}

function getYouTubeId_(url) {
  const text = String(url || '');
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?&]+)/, /youtube\.com\/shorts\/([^?&]+)/];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) return match[1];
  }
  return '';
}

function secondsToText_(seconds) {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m > 0) return sign + m + '분 ' + s + '초';
  return sign + s + '초';
}
