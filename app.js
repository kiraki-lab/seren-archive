const DATA_URL = 'data/public_records.csv';
let allRecords = [];
let chart;

function parseCSV(text){
  const rows=[];let row=[],cur='',inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&inQuotes&&n==='"'){cur+='"';i++;continue;}
    if(c==='"'){inQuotes=!inQuotes;continue;}
    if(c===','&&!inQuotes){row.push(cur);cur='';continue;}
    if((c==='\n'||c==='\r')&&!inQuotes){
      if(c==='\r'&&n==='\n')i++;
      row.push(cur);cur='';
      if(row.some(v=>v.trim()!==''))rows.push(row);
      row=[];continue;
    }
    cur+=c;
  }
  row.push(cur);if(row.some(v=>v.trim()!==''))rows.push(row);
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function truthy(v){return String(v).toLowerCase()==='true'||v==='TRUE'||v==='1';}
function num(v){return Number(String(v||'').replace(/[^0-9.]/g,''));}
function fmt(n){return Number(n).toLocaleString('ko-KR');}
function getLowestByJob(records){
  const map=new Map();
  records.forEach(r=>{const job=r.job;const score=num(r.clear_hexa||r.main_score);if(!job||!score)return;if(!map.has(job)||score<num(map.get(job).clear_hexa||map.get(job).main_score))map.set(job,r);});
  return [...map.values()];
}
function filteredRecords(){
  const q=document.querySelector('#searchInput').value.trim().toLowerCase();
  const job=document.querySelector('#jobFilter').value;
  let rows=allRecords.filter(r=>truthy(r.approved)&&r.status==='검증완료'&&truthy(r.is_main_record));
  if(job!=='all')rows=rows.filter(r=>r.job===job);
  if(q)rows=rows.filter(r=>[r.job,r.character_name,r.server,r.admin_note].join(' ').toLowerCase().includes(q));
  const sort=document.querySelector('#sortSelect').value;
  rows.sort((a,b)=>{
    if(sort==='desc')return num(b.clear_hexa)-num(a.clear_hexa);
    if(sort==='job')return String(a.job).localeCompare(String(b.job),'ko');
    if(sort==='date')return String(b.clear_date).localeCompare(String(a.clear_date));
    return num(a.clear_hexa)-num(b.clear_hexa);
  });
  return rows;
}
function renderStats(records){
  const approved=records.filter(r=>truthy(r.approved)&&r.status==='검증완료'&&truthy(r.is_main_record));
  const scores=approved.map(r=>num(r.clear_hexa||r.main_score)).filter(Boolean);
  document.querySelector('#approvedCount').textContent=approved.length;
  document.querySelector('#lowestScore').textContent=scores.length?fmt(Math.min(...scores)):'-';
  document.querySelector('#jobCount').textContent=new Set(approved.map(r=>r.job).filter(Boolean)).size;
  const dates=approved.map(r=>r.clear_date).filter(Boolean).sort();
  document.querySelector('#lastUpdated').textContent=dates.length?dates.at(-1):'-';
}
function renderJobFilter(records){
  const sel=document.querySelector('#jobFilter');
  const current=sel.value;
  const jobs=[...new Set(records.filter(r=>truthy(r.approved)&&truthy(r.is_main_record)).map(r=>r.job).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  sel.innerHTML='<option value="all">전체 직업</option>'+jobs.map(j=>`<option value="${j}">${j}</option>`).join('');
  if(jobs.includes(current))sel.value=current;
}
function renderCards(records){
  const grid=document.querySelector('#records');
  if(!records.length){grid.innerHTML='<div class="empty">조건에 맞는 기록이 없습니다.</div>';return;}
  grid.innerHTML=records.map(r=>{
    const score=num(r.clear_hexa||r.main_score);
    return `<article class="record-card">
      <div class="thumb"><img src="${r.thumbnail_url}" alt="${r.job} ${r.character_name} 유챔 세렌 클리어 영상"><span class="badge">영상</span></div>
      <div class="body">
        <div class="meta"><span class="dot"></span><span>${r.job}</span><span class="date">${r.clear_date||''}</span></div>
        <h3>HEXA ${fmt(score)}</h3>
        <p class="by">${r.character_name||''} · ${r.server||''}</p>
        <div class="tags"><span>${r.boss_variant||'유챔 세렌'}</span><span>${r.clear_time_left||''} 남기고 클리어</span><span>${r.patch_version||''}</span></div>
        <a class="watch" href="${r.youtube_url}" target="_blank" rel="noopener">유튜브 보기</a>
      </div>
    </article>`;
  }).join('');
}
function renderChart(records){
  const data=getLowestByJob(records);
  const sort=document.querySelector('#sortSelect').value;
  data.sort((a,b)=>sort==='desc'?num(b.clear_hexa)-num(a.clear_hexa):sort==='job'?String(a.job).localeCompare(String(b.job),'ko'):num(a.clear_hexa)-num(b.clear_hexa));
  const ctx=document.querySelector('#jobChart');
  if(chart)chart.destroy();
  chart=new Chart(ctx,{type:'bar',data:{labels:data.map(r=>r.job),datasets:[{label:'직업별 최저 HEXA',data:data.map(r=>num(r.clear_hexa||r.main_score)),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`HEXA ${fmt(c.raw)}`}}},scales:{y:{ticks:{callback:v=>fmt(v)}}}}});
}
function renderAll(){const rows=filteredRecords();renderStats(allRecords);renderJobFilter(allRecords);renderCards(rows);renderChart(rows);}
async function init(){
  try{const res=await fetch(DATA_URL,{cache:'no-store'});const text=await res.text();allRecords=parseCSV(text);renderAll();}
  catch(e){document.querySelector('#records').innerHTML='<div class="empty">데이터를 불러오지 못했습니다.</div>';console.error(e);}
}
document.querySelector('#searchInput').addEventListener('input',renderAll);
document.querySelector('#jobFilter').addEventListener('change',renderAll);
document.querySelector('#sortSelect').addEventListener('change',renderAll);
init();
