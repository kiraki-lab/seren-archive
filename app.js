const DATA_URLS = [
  'data/public_records.csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTiw94FJqiJg40ZnsKrp6UpG6imCF0281ijP564RvkHjnc8RJe94qSRa5V0WmXIUFGWIKK69Ql6oLG/pub?gid=1940770526&single=true&output=csv'
];
const SEREN_PATCH_DATE = '2026-03-19';
const CORE_PATCH_DATE = '2026-04-16';

const CLEAN_PALETTE = ['#8B7CF6','#F48FB1','#67CDE8','#9ADBC2','#F6C667','#C9A7FF','#FF9BB3','#7DD3FC','#B8E986','#FFB6D9','#A7B8FF','#F8D7DA'];
const KIRAKI_PALETTE = ['#FFBCDE','#E6E6FA','#A1EFFF','#CCFFD1','#FFEDBA','#84A9FF','#FFB6C1','#F8D7DA','#D9C2FF','#BDF7EE','#FFD6E8','#FFF0A8'];
const JOB_ALIASES = {'다크나이트':'닼나','블래스터':'블래','데몬슬레이어':'데슬','데몬어벤져':'데벤','보우마스터':'보마','패스파인더':'패파','윈드브레이커':'윈브','메르세데스':'메르','와일드헌터':'와헌','아크메이지(불,독)':'불독','아크메이지(불독)':'불독','아크메이지(썬,콜)':'썬콜','아크메이지(썬콜)':'썬콜','플레임위자드':'플위','루미너스':'루미','배틀메이지':'배메','키네시스':'키네','나이트로드':'나로','듀얼블레이드':'듀블','나이트워커':'나워','캐논슈터':'캐슈','스트라이커':'스커','엔젤릭버스터':'엔버'};

let allRecords = [];
let chart;
let currentScope = 'all';
let currentMetric = 'min';
let currentView = localStorage.getItem('kirakiChartView') || 'fit';
let currentTheme = localStorage.getItem('kirakiTheme') || 'clean';

function parseCSV(text){
  const rows=[]; let row=[], cur='', inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"'&&inQuotes&&n==='"'){cur+='"'; i++; continue;}
    if(c==='"'){inQuotes=!inQuotes; continue;}
    if(c===','&&!inQuotes){row.push(cur); cur=''; continue;}
    if((c==='\n'||c==='\r')&&!inQuotes){
      if(c==='\r'&&n==='\n') i++;
      row.push(cur); cur='';
      if(row.some(v=>v.trim()!=='')) rows.push(row);
      row=[]; continue;
    }
    cur+=c;
  }
  row.push(cur); if(row.some(v=>v.trim()!=='')) rows.push(row);
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function truthy(v){return String(v).toLowerCase()==='true'||v==='TRUE'||v==='1';}
function num(v){return Number(String(v||'').replace(/[^0-9.\-]/g,''));}
function fmt(n){return Number(n).toLocaleString('ko-KR');}
function shortFmt(n){return `${(Number(n)/10000).toFixed(2)}만`;}
function safe(v){return String(v||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function displayJob(job){return JOB_ALIASES[job] || job || '';}
function isApproved(r){return truthy(r.approved)&&r.status==='검증완료'&&num(r.clear_hexa||r.main_score)>0;}
function isOverrun(r){return num(r.clear_seconds_left)<0;}
function directLabel(r){return truthy(r.is_main_record)?'직접 기록':truthy(r.reference_only)?'참고 기록':'후보 기록';}
function palette(){return document.body.classList.contains('theme-kiraki') ? KIRAKI_PALETTE : CLEAN_PALETTE;}

function normalizeRecord(r){
  if(r.id==='REC-036'){
    r.server='에오스';
    r.admin_note=(r.admin_note||'').replaceAll('확인필요','에오스').replace('서버 확인 필요.','서버 에오스 확인.');
  }
  if(!r.main_score && r.clear_hexa) r.main_score = r.clear_hexa;
  if(!r.score_type) r.score_type = 'HEXA 환산';
  if(!r.thumbnail_url && r.youtube_id) r.thumbnail_url=`https://img.youtube.com/vi/${r.youtube_id}/hqdefault.jpg`;
  return r;
}
function mergeRecords(recordGroups){
  const map = new Map();
  recordGroups.flat().forEach(raw=>{
    const r = normalizeRecord({...raw});
    const key = r.youtube_id || r.youtube_url || r.id;
    if(!key) return;
    map.set(key, {...(map.get(key)||{}), ...r});
  });
  return [...map.values()];
}
function baseScopeRecords(){
  let rows=allRecords.filter(isApproved);
  if(currentScope==='serenPatch') rows=rows.filter(r=>r.clear_date>=SEREN_PATCH_DATE);
  if(currentScope==='corePatch') rows=rows.filter(r=>r.clear_date>=CORE_PATCH_DATE);
  return rows;
}
function scopeText(){
  if(currentScope==='serenPatch') return '2026-03-19 세렌 패치 후 기록';
  if(currentScope==='corePatch') return '2026-04-16 공용코어 개편 후 기록';
  return '전체 기록';
}
function metricText(){return currentMetric==='avg'?'평균 HEXA':'최저 HEXA';}
function makeJobSeries(records){
  const map=new Map();
  records.forEach(r=>{
    const job=displayJob(r.job); const score=num(r.clear_hexa||r.main_score);
    if(!job||!score) return;
    if(!map.has(job)) map.set(job,[]);
    map.get(job).push(r);
  });
  const data=[];
  map.forEach((items,job)=>{
    if(currentMetric==='avg'){
      const avg=Math.round(items.reduce((sum,r)=>sum+num(r.clear_hexa||r.main_score),0)/items.length);
      const latest=[...items].sort((a,b)=>String(b.clear_date).localeCompare(String(a.clear_date)))[0];
      data.push({job,score:avg,count:items.length,record:latest,isAverage:true});
    }else{
      const best=[...items].sort((a,b)=>num(a.clear_hexa||a.main_score)-num(b.clear_hexa||b.main_score))[0];
      data.push({job,score:num(best.clear_hexa||best.main_score),count:items.length,record:best,isAverage:false});
    }
  });
  const sort=document.querySelector('#sortSelect').value;
  data.sort((a,b)=> sort==='desc'?b.score-a.score:sort==='job'?String(a.job).localeCompare(String(b.job),'ko'):sort==='date'?String(b.record.clear_date).localeCompare(String(a.record.clear_date)):a.score-b.score);
  return data;
}
function filteredRecords(){
  const q=document.querySelector('#searchInput').value.trim().toLowerCase();
  const job=document.querySelector('#jobFilter').value;
  let rows=baseScopeRecords();
  if(job!=='all') rows=rows.filter(r=>displayJob(r.job)===job);
  if(q) rows=rows.filter(r=>[displayJob(r.job),r.job,r.character_name,r.server,r.admin_note,r.boss_variant].join(' ').toLowerCase().includes(q));
  const sort=document.querySelector('#sortSelect').value;
  rows.sort((a,b)=> sort==='desc'?num(b.clear_hexa)-num(a.clear_hexa):sort==='job'?String(displayJob(a.job)).localeCompare(String(displayJob(b.job)),'ko'):sort==='date'?String(b.clear_date).localeCompare(String(a.clear_date)):num(a.clear_hexa)-num(b.clear_hexa));
  return rows;
}
function renderStats(){
  const rows=baseScopeRecords();
  const scores=rows.map(r=>num(r.clear_hexa||r.main_score)).filter(Boolean);
  document.querySelector('#approvedCount').textContent=rows.length;
  document.querySelector('#lowestScore').textContent=scores.length?fmt(Math.min(...scores)):'-';
  document.querySelector('#jobCount').textContent=new Set(rows.map(r=>displayJob(r.job)).filter(Boolean)).size;
  const dates=rows.map(r=>r.clear_date).filter(Boolean).sort();
  document.querySelector('#lastUpdated').textContent=dates.length?dates.at(-1):'-';
  document.querySelector('#scopeDescription').textContent=`${scopeText()} 중 직업별 ${metricText()}를 표시합니다.`;
}
function renderJobFilter(){
  const sel=document.querySelector('#jobFilter'); const current=sel.value;
  const jobs=[...new Set(baseScopeRecords().map(r=>displayJob(r.job)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  sel.innerHTML='<option value="all">전체 직업</option>'+jobs.map(j=>`<option value="${safe(j)}">${safe(j)}</option>`).join('');
  if(jobs.includes(current)) sel.value=current;
}
function renderCards(records){
  const grid=document.querySelector('#records');
  if(!records.length){grid.innerHTML='<div class="empty">조건에 맞는 기록이 없습니다.</div>';return;}
  grid.innerHTML=records.map(r=>{
    const score=num(r.clear_hexa||r.main_score); const over=isOverrun(r); const thumb=r.thumbnail_url||''; const jobName=displayJob(r.job);
    const watch=r.youtube_url?`<a class="watch" href="${safe(r.youtube_url)}" target="_blank" rel="noopener">유튜브 보기</a>`:'<span class="watch disabled">영상 링크 없음</span>';
    return `<article class="record-card ${over?'overrun-card':''}"><div class="thumb"><img src="${safe(thumb)}" alt="${safe(jobName)} ${safe(r.character_name)} 유챔 세렌 클리어 영상"><span class="badge">${safe(directLabel(r))}</span></div><div class="body"><div class="meta"><span class="dot"></span><span>${safe(jobName)}</span><span class="date">${safe(r.clear_date||'')}</span></div><h3>HEXA ${fmt(score)}</h3><p class="by">${safe(r.character_name||'')} · ${safe(r.server||'')}</p><div class="tags"><span>${safe(r.boss_variant||'유챔 세렌')}</span><span>${safe(r.clear_time_left||'')} ${over?'초과':'남기고 클리어'}</span><span>${safe(r.patch_version||'')}</span></div>${watch}</div></article>`;
  }).join('');
}
function makeGradient(ctx, area, base, isMin, isOver){
  const g=ctx.createLinearGradient(0,area.bottom,0,area.top);
  if(isOver){g.addColorStop(0,'#ffb6c1');g.addColorStop(.55,'#ff8fa3');g.addColorStop(1,'#ffffff');return g;}
  if(isMin){g.addColorStop(0,'#f8d7da');g.addColorStop(.45,'#ffedba');g.addColorStop(.78,'#ffffff');g.addColorStop(1,'#ffbcde');return g;}
  if(document.body.classList.contains('theme-kiraki')){g.addColorStop(0,base);g.addColorStop(.55,'#fff0f8');g.addColorStop(1,'#ffffff');return g;}
  g.addColorStop(0,base); g.addColorStop(1,base); return g;
}
const valueLabelPlugin={id:'valueLabelPlugin',afterDatasetsDraw(chart){
  const {ctx}=chart; const meta=chart.getDatasetMeta(0); const data=chart.data.datasets[0].data; const min=Math.min(...data); const max=Math.max(...data);
  ctx.save(); ctx.font=`700 ${currentView==='fit'?9:10}px Jua, system-ui, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='bottom';
  meta.data.forEach((bar,index)=>{
    const value=data[index]; if(!value) return;
    const shouldLabel = currentView==='detail' || value===min || value===max;
    if(!shouldLabel) return;
    ctx.fillStyle=value===min?'#9f1239':'#3b3048';
    ctx.fillText(value===min?`✦ ${shortFmt(value)}`:shortFmt(value),bar.x,bar.y-5);
  });
  ctx.restore();
}};
function renderChart(records){
  const series=makeJobSeries(records); const inner=document.querySelector('#chartInner'); const scroller=document.querySelector('#chartScroller');
  inner.classList.toggle('fit-view', currentView==='fit'); inner.classList.toggle('detail-view', currentView==='detail');
  if(currentView==='fit'){inner.style.width='100%'; scroller.classList.add('no-scroll');} else {inner.style.width=`${Math.max(980,series.length*46)}px`; scroller.classList.remove('no-scroll');}
  const ctx=document.querySelector('#jobChart'); if(chart) chart.destroy();
  const values=series.map(d=>d.score); const minValue=values.length?Math.min(...values):0; const maxValue=values.length?Math.max(...values):0;
  const yMin=values.length?Math.max(0,Math.floor((minValue-1300)/1000)*1000):0; const yMax=values.length?Math.ceil((maxValue+1300)/1000)*1000:60000;
  chart=new Chart(ctx,{type:'bar',data:{labels:series.map(d=>d.job),datasets:[{label:metricText(),data:values,backgroundColor:(context)=>{const {chart,dataIndex}=context;const area=chart.chartArea;const colors=palette();if(!area)return colors[dataIndex%colors.length];const rec=series[dataIndex]?.record;return makeGradient(chart.ctx,area,colors[dataIndex%colors.length],values[dataIndex]===minValue,rec&&isOverrun(rec));},borderColor:series.map((d,i)=>d.score===minValue?'#f59eaf':(isOverrun(d.record)?'#ef4444':palette()[i%palette().length])),borderWidth:1.4,borderRadius:currentView==='fit'?5:10,borderSkipped:false,barPercentage:currentView==='fit'?.92:.68,categoryPercentage:currentView==='fit'?.92:.84}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:350},plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(42,32,54,.92)',titleFont:{family:'Jua',size:15},bodyFont:{family:'Gowun Dodum',size:13},callbacks:{title:items=>series[items[0].dataIndex]?.job||'',label:c=>`${metricText()} ${fmt(c.raw)}`,afterLabel:c=>{const r=series[c.dataIndex]?.record;if(!r)return '';return `${r.character_name||''} · ${r.server||''} · ${r.clear_date||''}`;}}}},scales:{x:{ticks:{autoSkip:false,maxRotation:currentView==='fit'?70:50,minRotation:currentView==='fit'?70:42,color:'#51445f',font:{family:'Jua',size:currentView==='fit'?9:12}},grid:{display:false}},y:{min:yMin,max:yMax,ticks:{callback:v=>fmt(v),color:'#8a7d94',font:{family:'Gowun Dodum',size:currentView==='fit'?10:12}},grid:{color:document.body.classList.contains('theme-kiraki')?'rgba(255,188,222,.32)':'rgba(148,163,184,.22)',borderDash:[2,8]}}}},plugins:[valueLabelPlugin]});
}
function renderOverruns(records){const box=document.querySelector('#overrunBox');const rows=records.filter(isOverrun).sort((a,b)=>num(a.clear_seconds_left)-num(b.clear_seconds_left));if(!rows.length){box.hidden=true;box.innerHTML='';return;}box.hidden=false;box.innerHTML=`<strong>시간 초과 참고 기록</strong><div>${rows.map(r=>`${safe(displayJob(r.job))} · ${safe(r.character_name)} · HEXA ${fmt(num(r.clear_hexa))} · ${Math.abs(num(r.clear_seconds_left))}초 초과`).join('<br>')}</div>`;}
function setActiveButtons(){document.querySelectorAll('[data-scope]').forEach(btn=>btn.classList.toggle('active',btn.dataset.scope===currentScope));document.querySelectorAll('[data-metric]').forEach(btn=>btn.classList.toggle('active',btn.dataset.metric===currentMetric));document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===currentView));}
function applyTheme(theme){currentTheme=theme;document.body.classList.toggle('theme-kiraki',theme==='kiraki');document.body.classList.toggle('theme-clean',theme!=='kiraki');localStorage.setItem('kirakiTheme',theme);const btn=document.querySelector('#themeToggle');if(btn)btn.innerHTML=theme==='kiraki'?'<span class="theme-toggle-main">🌙 깔끔 모드</span><small>데이터 집중 보기</small>':'<span class="theme-toggle-main">✨ 키라키 모드</span><small>반짝 테마 켜기</small>';}
function renderAll(){setActiveButtons();const rows=filteredRecords();renderStats();renderJobFilter();renderCards(rows);renderChart(rows);renderOverruns(rows);}
async function init(){try{applyTheme(currentTheme);const groups=await Promise.all(DATA_URLS.map(async url=>{try{const res=await fetch(url,{cache:'no-store'});if(!res.ok) return [];return parseCSV(await res.text());}catch(e){console.warn('데이터 불러오기 실패',url,e);return []}}));allRecords=mergeRecords(groups);renderAll();}catch(e){document.querySelector('#records').innerHTML='<div class="empty">데이터를 불러오지 못했습니다.</div>';console.error(e);}}

document.querySelector('#searchInput').addEventListener('input',renderAll);document.querySelector('#jobFilter').addEventListener('change',renderAll);document.querySelector('#sortSelect').addEventListener('change',renderAll);document.querySelectorAll('[data-scope]').forEach(btn=>btn.addEventListener('click',()=>{currentScope=btn.dataset.scope;document.querySelector('#jobFilter').value='all';renderAll();}));document.querySelectorAll('[data-metric]').forEach(btn=>btn.addEventListener('click',()=>{currentMetric=btn.dataset.metric;renderAll();}));document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{currentView=btn.dataset.view;localStorage.setItem('kirakiChartView',currentView);renderAll();}));document.querySelector('#themeToggle')?.addEventListener('click',()=>{applyTheme(currentTheme==='kiraki'?'clean':'kiraki');renderAll();});init();
