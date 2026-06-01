# 키라키 유챔 세렌 최소컷 아카이브 v0.4

26년 3월 19일 패치 이후, 유튜브 클리어 영상을 기반으로 유챔 세렌 최소컷 기록과 빌드를 모으는 정적 웹사이트입니다.

## 운영 기준

- 메인 기준 수치: `HEXA 환산`
- 패치 기준: `26년 3월 19일 패치 이후`
- 키라키 채널: `https://youtube.com/channel/UCTa93vcBRawFA1YLyDOAkdw?si=RAosYvNcb20jcBWu`
- GitHub 저장소: `kiraki-lab/seren-archive`
- Pages URL 예정: `https://kiraki-lab.github.io/seren-archive/`
- 공개 조건: `approved=TRUE` + `status=검증완료` + `main_score`가 숫자인 자료

## 연결된 Google 리소스

- Form URL: https://docs.google.com/forms/d/e/1FAIpQLSdTpHnbJGHl1pS1e1Ku8W6BK1RyKCX1An6xe2iA4cqO1qafQA/viewform
- Form Edit URL: https://docs.google.com/forms/d/1a1IZ0EejjGaJtrXdR2vbYrBb7-FfJ3DN7foiJmwdF8E/edit
- Spreadsheet URL: https://docs.google.com/spreadsheets/d/11CpZr5Z4mb-K_-DApqFTXqfuYXunoRkpbtOFzS-nMCw/edit
- Public_Records CSV URL: https://docs.google.com/spreadsheets/d/e/2PACX-1vSTiw94FJqiJg40ZnsKrp6UpG6imCF0281ijP564RvkHjnc8RJe94qSRa5V0WmXIUFGWIKK69Ql6oLG/pub?gid=1940770526&single=true&output=csv

## 데이터 흐름

```txt
시청자 제보 Google Form
→ Records 시트에 저장
→ PD 검수 후 approved=TRUE, status=검증완료
→ Public_Records 시트에 공개용 컬럼만 자동 반영
→ GitHub Pages 사이트가 Public_Records CSV를 읽어 차트/카드 생성
```

## 포함 파일

- `index.html` : 메인 페이지
- `styles.css` : 전체 디자인
- `app.js` : CSV 불러오기, 차트, 카드, 필터, 정렬 로직
- `assets/kiraki-mark.svg` : 기본 키라키 마크
- `data/records_template.csv` : 공개 CSV 컬럼 템플릿
- `data/sample_records.csv` : 기재 예시. 기본 사이트에서는 노출되지 않음
- `google-apps-script/setup_kiraki_seren.gs` : Google Form + Sheets 자동 생성용 스크립트
- `google-apps-script/upgrade_to_v0_3_public_records.gs` : Public_Records 생성/업그레이드 스크립트
- `docs/` : 운영/검수/배포 가이드

## GitHub Pages 활성화

1. 저장소 `Settings` → `Pages`로 이동합니다.
2. Source를 `Deploy from a branch`로 선택합니다.
3. Branch는 `main`, folder는 `/root`로 선택합니다.
4. 저장 후 1~5분 뒤 `https://kiraki-lab.github.io/seren-archive/`에서 확인합니다.

## 검수 후 공개 방법

Records 시트에서 해당 행을 아래처럼 바꿉니다.

```txt
approved: TRUE
status: 검증완료
```

그러면 Public_Records에 자동 반영되고, 사이트 새로고침 시 차트와 카드에 표시됩니다.
