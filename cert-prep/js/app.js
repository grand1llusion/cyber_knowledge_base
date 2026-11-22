/* Cert Prep Hub — views & sessions */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const pct=(a,b)=>b?Math.round(100*a/b):0;
const view=()=>$('#view');
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2600); }
window.UI={esc,md,toast,shuffle};

/* ---------- cert/deck helpers ---------- */
const certs=()=>REGISTRY.certs;
function certFor(code){ code=String(code||'').toLowerCase(); return certs().find(c=>c.id===code||(c.codes||[]).includes(code)); }
function decksFor(cid){ return Store.deckList().filter(d=>{ const c=certFor(d.cert); return cid? (c&&c.id===cid) : !c; }); }
function examDomain(cert,item){
  if(item.examDomain) return item.examDomain; const tag=(item.domain||'').trim().toLowerCase(); if(!cert||!cert.domains.length) return item.domain||'Unsorted';
  for(const d of cert.domains){ if(d.name.toLowerCase()===tag||(d.aliases||[]).some(a=>a.toLowerCase()===tag)) return d.name; }
  return item.domain||'Unsorted';
}
function itemsFor(cid,kind){ const out=[]; decksFor(cid).forEach(d=>{ if(kind&&d.kind!==kind) return; d.items.forEach(it=>out.push(Object.assign({deckId:d.id,deckTitle:d.title,kind:d.kind},it))); }); return out; }
const keyed=it=>it.kind==='pbq'||(it.answer&&it.answer.length);
function mastery(cert){
  const P=Store.progress(); const items=itemsFor(cert.id).filter(keyed);
  const by={}; cert.domains.forEach(d=>by[d.name]={total:0,mastered:0,seen:0,right:0,wrong:0});
  items.forEach(it=>{ const dn=examDomain(cert,it); const b=by[dn]||(by[dn]={total:0,mastered:0,seen:0,right:0,wrong:0,extra:true}); b.total++; const r=P[it.id]; if(r){ b.seen++; b.right+=r.right; b.wrong+=r.wrong; if(r.lastOk&&r.box>=3) b.mastered++; } });
  let ready=0, wsum=0; cert.domains.forEach(d=>{ const b=by[d.name]; wsum+=d.weight; ready+=d.weight*(b.total?b.mastered/b.total:0); });
  return {by, ready: wsum?Math.round(ready/wsum*100):0, total:items.length};
}
function wbar(cert,big){
  if(!cert.domains.length) return '<div class="wbar"><div class="seg" style="flex:1"><span>Domains not loaded yet</span></div></div>';
  const m=mastery(cert);
  return `<div class="wbar${big?' big':''}" role="img" aria-label="Domain mastery weighted by exam share">`+cert.domains.map(d=>{ const b=m.by[d.name]; const f=b.total?b.mastered/b.total:0;
    return `<div class="seg" style="flex:${d.weight}" title="${esc(d.name)} — ${d.weight}% of exam, ${Math.round(f*100)}% mastered"><div class="fill" style="width:${f*100}%;opacity:.85"></div><span>${d.weight}%</span></div>`; }).join('')+'</div>';
}

/* ---------- router ---------- */
const routes={};
function go(h){ location.hash=h; }
function route(){
  const h=(location.hash||'#/').slice(1).split('/').filter(Boolean);
  $$('.topbar nav a').forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#/'+(h[0]||'')));
  window.scrollTo(0,0);
  if(Session.active && h[0]!=='run'){ Session.active=null; clearInterval(Session.tick); }
  (routes[h[0]||'']||routes[''])(h.slice(1));
}
window.addEventListener('hashchange',route);

/* ---------- home ---------- */
routes['']=()=>{
  const cs=certs(); const mine=decksFor(null);
  view().innerHTML=`
  <h1>Certification prep</h1>
  <p class="lede">Pick a certification to practise questions, run performance-based labs, sit a timed exam or step through the range. Load your own deck files to add questions.</p>
  <div class="certs">${cs.map(c=>{ const ds=decksFor(c.id); const n=ds.reduce((a,d)=>a+d.items.length,0); const m=mastery(c);
    return `<a class="cert${c.status==='planned'&&!n?' planned':''}" href="#/cert/${c.id}">
      <div class="row" style="justify-content:space-between"><span class="code">${esc(c.vendor)} ${esc(c.code)}</span>${c.status==='planned'?'<span class="pill">Planned</span>':`<span class="pill ${m.ready>=75?'ok':''}">${m.ready}% ready</span>`}</div>
      <div class="name">${esc(c.name)}</div>
      ${wbar(c)}
      <div class="stats"><span><b>${ds.filter(d=>d.kind==='mc').reduce((a,d)=>a+d.items.length,0)}</b> questions</span><span><b>${ds.filter(d=>d.kind==='pbq').reduce((a,d)=>a+d.items.length,0)}</b> PBQs</span><span><b>${ds.length}</b> decks</span></div>
    </a>`; }).join('')}</div>
  <h2>My decks</h2>
  <p class="muted small" style="margin-top:-6px">Decks that don't name a certification land here, like your WGU quiz-engine decks.</p>
  ${mine.length?`<table class="list"><tr><th>Deck</th><th>Questions</th><th></th></tr>${mine.map(d=>`<tr><td>${esc(d.title)}</td><td>${d.items.length}</td><td class="row">${d.kind==='pbq'?`<button class="btn quiet" data-f="${esc(d.id)}">Open labs</button>`:`<button class="btn quiet" data-q="${esc(d.id)}">Quiz</button><button class="btn quiet" data-f="${esc(d.id)}">Flashcards</button>`}</td></tr>`).join('')}</table>`:'<div class="empty">No personal decks yet. Drop a .md or .json deck below, or <button class="btn quiet" id="samp">load the sample decks</button> to try every question type.</div>'}
  <h2>Load decks</h2>
  ${dropZone()}`;
  wireDrop(); const sb=$('#samp'); if(sb) sb.onclick=async()=>{ try{ for(const f of ['samples/sample-mc.txt','samples/sample-pbq.json']){ const r=await fetch(f); Store.putDeck(Parse.parseText(await r.text(),f.split('/').pop())); } route(); }catch(e){ toast('Samples load only when the hub is served over the web, not opened as a file.'); } };
  $$('[data-q]').forEach(b=>b.onclick=()=>Session.startQuiz(Store.decks()[b.dataset.q].items.map(it=>({...it,deckId:b.dataset.q,kind:'mc'})),{title:Store.decks()[b.dataset.q].title}));
  $$('[data-f]').forEach(b=>b.onclick=()=>Store.decks()[b.dataset.f].kind==='pbq'?Session.startPBQ(Store.decks()[b.dataset.f].items.map(it=>({...it,kind:'pbq'})),0,{title:Store.decks()[b.dataset.f].title}):Session.startFlash(Store.decks()[b.dataset.f].items.map(it=>({...it,deckId:b.dataset.f,kind:'mc'})),{title:Store.decks()[b.dataset.f].title}));
};
function dropZone(){ return `<div class="drop" id="drop"><p style="margin:0 0 10px">Drop deck files here (.md or .json), or</p><label class="btn"><input type="file" id="file" multiple accept=".md,.markdown,.txt,.json" hidden>Choose files</label><p class="muted small" style="margin:10px 0 0">Files stay in this browser. Nothing is uploaded.</p></div>`; }
function wireDrop(){
  const z=$('#drop'), f=$('#file'); if(!z) return;
  f.onchange=()=>loadFiles(f.files);
  z.ondragover=e=>{e.preventDefault();z.classList.add('over');}; z.ondragleave=()=>z.classList.remove('over');
  z.ondrop=e=>{e.preventDefault();z.classList.remove('over');loadFiles(e.dataTransfer.files);};
}
async function loadFiles(files){
  const msgs=[];
  for(const file of files){
    try{ const t=await file.text(); const d=Parse.parseText(t,file.name);
      if(d.backup){ Store.importAll(d.backup); msgs.push(file.name+': progress restored'); continue; }
      if(d.range){ const R=Store.prefs().ranges||{}; R[d.range.id]=d.range; Store.setPref('ranges',R); msgs.push(file.name+': range scenario loaded'); continue; }
      if(Store.putDeck(d)) msgs.push(`${file.name}: ${d.items.length} ${d.kind==='pbq'?'PBQs':'questions'}${certFor(d.cert)?' → '+certFor(d.cert).name:' → My decks'}`);
    }catch(e){ msgs.push(file.name+': '+e.message); }
  }
  alert(msgs.join('\n')); route();
}

/* ---------- cert view ---------- */
routes.cert=([cid,tab='overview'])=>{
  const c=certFor(cid); if(!c) return go('#/');
  const tabs=[['overview','Overview'],['practice','Practice'],['flash','Flashcards'],['pbq','PBQ lab'],['exam','Exam simulation']]; if(c.range) tabs.push(['range','Range']);
  view().innerHTML=`<p class="small"><a href="#/">All certifications</a></p>
    <h1>${esc(c.vendor)} ${esc(c.name)} <span class="code muted" style="font-size:1rem;font-family:var(--mono)">${esc(c.code)}</span></h1>
    ${c.exam?`<p class="muted" style="margin:0">Up to ${c.exam.questions} questions · ${c.exam.minutes} minutes · passing ${esc(c.exam.pass)}</p>`:'<p class="muted" style="margin:0">Exam details not set yet.</p>'}
    <div class="tabs">${tabs.map(([k,l])=>`<button class="${k===tab?'on':''}" onclick="location.hash='#/cert/${c.id}/${k}'">${l}</button>`).join('')}</div><div id="tab"></div>`;
  ({overview:certOverview,practice:certPractice,flash:certFlash,pbq:certPBQ,exam:certExam,range:certRange}[tab]||certOverview)(c,$('#tab'));
};
function certOverview(c,el){
  const m=mastery(c); const ds=decksFor(c.id);
  el.innerHTML=`${wbar(c,true)}
   <div class="legend">${c.domains.map(d=>{const b=m.by[d.name];return `<div><span>${esc(d.name)} <span class="muted">${d.weight}%</span></span><span>${b.mastered}/${b.total} mastered · ${pct(b.right,b.right+b.wrong)}% acc.</span></div>`;}).join('')}</div>
   ${Object.entries(m.by).filter(([k,v])=>v.extra).length?`<p class="muted small">Untagged or unmapped items: ${Object.entries(m.by).filter(([k,v])=>v.extra).map(([k,v])=>esc(k)+' ('+v.total+')').join(', ')}</p>`:''}
   ${c.note?`<p class="muted small">${esc(c.note)}</p>`:''}
   <p class="muted small">A segment's width is its share of the exam; the fill is the share of its questions you've answered right at least twice in a row.</p>
   <h2>Decks</h2>
   ${ds.length?`<table class="list"><tr><th>Deck</th><th>Type</th><th>Items</th><th>Unkeyed</th></tr>${ds.map(d=>`<tr><td>${esc(d.title)}</td><td>${d.kind==='pbq'?'PBQ':'Multiple choice'}</td><td>${d.items.length}</td><td>${d.kind==='pbq'?'—':d.items.filter(i=>!i.answer.length).length}</td></tr>`).join('')}</table>`:`<div class="empty">No decks loaded for ${esc(c.name)}. Load the deck files from your Drive folder <b>Certifications / ${esc(c.vendor)}_${esc(c.name)}</b> / decks.</div>`}
   <h2>Load decks</h2>${dropZone()}
   <h2>Recent exams</h2>${examHistory(c)}`;
  wireDrop();
}
function examHistory(c){ const ex=Store.exams().filter(e=>e.cert===c.id).slice(0,8); return ex.length?`<table class="list"><tr><th>Date</th><th>Length</th><th>Score</th><th>Est. scaled</th></tr>${ex.map(e=>`<tr><td>${new Date(e.at).toLocaleString()}</td><td>${e.total} items · ${Math.round(e.secs/60)} min</td><td>${e.pct}%</td><td>${e.scaled}</td></tr>`).join('')}</table>`:'<p class="muted">No exam runs yet.</p>'; }

function filterForm(c,el,kind,onStart,label){
  const ds=decksFor(c.id).filter(d=>d.kind==='mc'); if(!ds.length){ el.innerHTML=`<div class="empty">Load a multiple-choice deck for ${esc(c.name)} first (Overview tab).</div>`; return; }
  const seenD=new Set(itemsFor(c.id,'mc').map(it=>examDomain(c,it))); const doms=[...c.domains.map(d=>d.name).filter(n=>seenD.has(n)),...[...seenD].filter(n=>!c.domains.some(d=>d.name===n))];
  el.innerHTML=`<div class="panel"><div class="grid2">
   <div><label class="f">Decks</label><div class="checks">${ds.map(d=>`<label><input type="checkbox" name="dk" value="${esc(d.id)}" checked> ${esc(d.title)} <span class="muted">(${d.items.length})</span></label>`).join('')}</div></div>
   <div><label class="f">Domains</label><div class="checks">${doms.map(d=>`<label><input type="checkbox" name="dm" value="${esc(d)}" checked> ${esc(d)}</label>`).join('')}</div></div></div>
   <div class="row" style="margin-top:14px;align-items:flex-end">
    <label class="f">Questions<select id="mode"><option value="all">All</option><option value="unseen">Not seen yet</option><option value="missed">Missed last time</option><option value="due">Due for review</option><option value="flag">Flagged</option><option value="unkeyed">No answer key yet</option></select></label>
    <label class="f">How many<input id="cnt" type="number" min="1" value="25" style="width:90px"></label>
    <label class="f">Order<select id="ord"><option value="shuffle">Shuffled</option><option value="seq">In deck order</option></select></label>
    <button class="btn" id="go">${label}</button><span class="muted small" id="avail"></span></div></div>`;
  const pick=()=>{ const dk=$$('[name=dk]:checked',el).map(x=>x.value), dm=$$('[name=dm]:checked',el).map(x=>x.value), mode=$('#mode',el).value; const P=Store.progress(); const now=Date.now();
    let it=itemsFor(c.id,'mc').filter(i=>dk.includes(i.deckId)&&dm.includes(examDomain(c,i)));
    it=it.filter(i=>{const r=P[i.id]; return mode==='all'||(mode==='unseen'&&!r?.seen)||(mode==='missed'&&r&&r.seen&&!r.lastOk)||(mode==='due'&&r&&r.seen&&(r.due||0)<=now)||(mode==='flag'&&r?.flag)||(mode==='unkeyed'&&!i.answer.length);});
    return it; };
  const upd=()=>$('#avail',el).textContent=pick().length+' match';
  el.oninput=upd; upd();
  $('#go',el).onclick=()=>{ let it=pick(); if(!it.length) return toast('No questions match those filters.'); if($('#ord',el).value==='shuffle') it=shuffle(it); onStart(it.slice(0,+$('#cnt',el).value||25)); };
}
function certPractice(c,el){ filterForm(c,el,'mc',it=>Session.startQuiz(it,{title:c.name+' practice',cert:c}),'Start practice'); }
function certFlash(c,el){ filterForm(c,el,'mc',it=>Session.startFlash(it,{title:c.name+' flashcards',cert:c}),'Start flashcards'); }
function certPBQ(c,el){
  const it=itemsFor(c.id,'pbq'); const P=Store.progress();
  if(!it.length){ el.innerHTML=`<div class="empty">No PBQ deck loaded for ${esc(c.name)}. Load the <code>*-pbq.json</code> file from Drive on the Overview tab.</div>`; return; }
  el.innerHTML=`<table class="list"><tr><th>Lab</th><th>Domain</th><th>Last result</th><th></th></tr>${it.map((p,i)=>{const r=P[p.id];return `<tr><td><b>${esc(p.title)}</b><div class="muted small">${esc(p.source||'')}</div></td><td>${esc(examDomain(c,p))}</td><td>${r?(r.lastScore!=null?r.lastScore+'%':'—'):'Not tried'}</td><td><button class="btn quiet" data-i="${i}">Open lab</button></td></tr>`;}).join('')}</table>`;
  $$('[data-i]',el).forEach(b=>b.onclick=()=>Session.startPBQ(it,+b.dataset.i,{title:c.name+' PBQ lab',cert:c}));
}
function certExam(c,el){
  const mc=itemsFor(c.id,'mc').filter(keyed), pb=itemsFor(c.id,'pbq');
  if(!mc.length){ el.innerHTML='<div class="empty">The exam simulation needs at least one multiple-choice deck with answer keys.</div>'; return; }
  const full=c.exam||{questions:Math.min(60,mc.length),minutes:90};
  el.innerHTML=`<div class="panel"><h3>Timed exam</h3><p class="muted">PBQs come first, as on the real exam. Questions are drawn in proportion to each domain's exam weight from keyed items only. You can flag and revisit questions; nothing is graded until you submit or time runs out.</p>
   <div class="row" style="align-items:flex-end">
    <label class="f">Length<select id="len"><option value="full">Full: ${full.questions} items, ${full.minutes} min</option><option value="half">Half: ${Math.round(full.questions/2)} items, ${Math.round(full.minutes/2)} min</option><option value="quick">Quick: 20 items, 37 min</option></select></label>
    <label class="f">PBQs first<select id="pbn">${[0,1,2,3,4,5].map(n=>`<option ${n===Math.min(3,pb.length)?'selected':''} ${n>pb.length?'disabled':''}>${n}</option>`).join('')}</select></label>
    <button class="btn" id="go">Start exam</button></div>
   <p class="muted small">${mc.length} keyed questions and ${pb.length} PBQs available.</p></div>
   <h2>Recent exams</h2>${examHistory(c)}`;
  $('#go',el).onclick=()=>{ const L=$('#len',el).value; const n=L==='full'?full.questions:L==='half'?Math.round(full.questions/2):20; const mins=L==='full'?full.minutes:L==='half'?Math.round(full.minutes/2):37;
    const npb=+$('#pbn',el).value; const pbs=shuffle(pb).slice(0,npb); const nmc=Math.max(1,n-npb);
    let pool=[]; const byD={}; mc.forEach(i=>{const d=examDomain(c,i);(byD[d]=byD[d]||[]).push(i);});
    if(c.domains.length){ c.domains.forEach(d=>{ const want=Math.round(nmc*d.weight/100); pool.push(...shuffle(byD[d.name]||[]).slice(0,want)); }); }
    const used=new Set(pool.map(i=>i.id)); pool.push(...shuffle(mc.filter(i=>!used.has(i.id))).slice(0,Math.max(0,nmc-pool.length))); pool=shuffle(pool).slice(0,nmc);
    Session.startExam([...pbs,...pool],{cert:c,minutes:mins}); };
}
function certRange(c,el){
  const R=Object.assign({},window.RANGES||{},Store.prefs().ranges||{}); const sc=R[c.range];
  if(!sc){ el.innerHTML='<div class="empty">No range scenario loaded for this certification.</div>'; return; }
  RangeView.render(el,sc,{cert:c});
}

/* ---------- decks page ---------- */
routes.decks=()=>{
  const ds=Store.deckList();
  view().innerHTML=`<h1>Decks</h1><p class="lede">Every deck loaded in this browser. Change a deck's certification to move it between hubs.</p>
  ${ds.length?`<table class="list"><tr><th>Deck</th><th>Certification</th><th>Items</th><th>Source file</th><th></th></tr>${ds.map(d=>`<tr><td>${esc(d.title)}<div class="muted small">${d.kind==='pbq'?'PBQ':'Multiple choice'}</div></td><td><select data-c="${esc(d.id)}"><option value="">My decks</option>${certs().map(c=>`<option value="${c.id}" ${certFor(d.cert)?.id===c.id?'selected':''}>${esc(c.name)} ${esc(c.code)}</option>`).join('')}</select></td><td>${d.items.length}</td><td class="small muted">${esc(d.source)}</td><td><button class="btn danger" data-x="${esc(d.id)}">Remove</button></td></tr>`).join('')}</table>`:'<div class="empty">No decks loaded yet.</div>'}
  <h2>Load decks</h2>${dropZone()}
  <h2>Deck formats</h2><p class="muted">Markdown (CompTIA-style blocks, or the WGU quiz-engine Test Bank and Simple layouts) and JSON. The full spec is in <a href="https://github.com/grand1llusion/cyber_knowledge_base/blob/main/cert-prep/FORMAT.md" target="_blank" rel="noopener">FORMAT.md</a>.</p>`;
  wireDrop();
  $$('[data-c]').forEach(s=>s.onchange=()=>{ const d=Store.decks()[s.dataset.c]; d.cert=s.value; Store.putDeck(d); toast('Moved'); });
  $$('[data-x]').forEach(b=>b.onclick=()=>{ if(confirm('Remove this deck from the browser? Your progress on its questions is kept.')){ Store.delDeck(b.dataset.x); route(); }});
};

/* ---------- progress page ---------- */
routes.progress=()=>{
  const P=Store.progress(); const n=Object.keys(P).length;
  view().innerHTML=`<h1>Progress</h1><p class="lede">Progress lives in this browser. Export it to move between devices, then load the backup file on the other device's hub.</p>
   <div class="certs">${certs().filter(c=>decksFor(c.id).length).map(c=>{const m=mastery(c);return `<div class="cert"><span class="code">${esc(c.code)}</span><div class="name">${esc(c.name)}</div>${wbar(c)}<div class="stats"><span><b>${m.ready}%</b> weighted readiness</span><span><b>${m.total}</b> keyed items</span></div></div>`;}).join('')||'<div class="empty">Load decks to see progress.</div>'}</div>
   <h2>Backup</h2><div class="row"><button class="btn" id="ex1">Export progress</button><button class="btn quiet" id="ex2">Export progress and decks</button><span class="muted small">${n} items tracked</span></div>
   <p class="muted small">To restore, drop the backup .json on any Load decks area.</p>`;
  const dl=(o,name)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'})); a.download=name; a.click(); };
  $('#ex1').onclick=()=>dl(Store.exportAll(false),'certprep-progress-'+new Date().toISOString().slice(0,10)+'.json');
  $('#ex2').onclick=()=>dl(Store.exportAll(true),'certprep-full-backup-'+new Date().toISOString().slice(0,10)+'.json');
};

/* ---------- sessions ---------- */
const Session={active:null};
window.Session=Session;
routes.run=()=>{ if(!Session.active) return go('#/'); Session.active.render(); };
function header(s,extra=''){ return `<div class="row" style="justify-content:space-between;max-width:860px"><div><a href="javascript:history.back()" class="small">Leave session</a><h1 style="font-size:1.4rem;margin-top:4px">${esc(s.title)}</h1></div>${extra}</div>`; }
function qMeta(it,cert){ const f=(it.flags||[]); const P=Store.progress()[it.id];
  return `<div class="meta"><span class="pill">${esc(it.qid)}</span><span class="pill">${esc(cert?examDomain(cert,it):it.domain||'')}</span>${f.includes('claude-keyed')?'<span class="pill amber" title="Answer key proposed by Claude — review it">Claude-keyed</span>':''}${f.includes('check-exhibit')?'<span class="pill amber" title="The source refers to an exhibit that may be missing">Exhibit may be missing</span>':''}${!it.answer.length?'<span class="pill">Self-check</span>':''}${P?.flag?'<span class="pill amber">Flagged</span>':''}</div>`; }

Session.startQuiz=(items,o)=>{
  const s={type:'quiz',title:o.title,cert:o.cert,items,i:0,right:0,done:0,sel:[],answered:false};
  s.render=()=>{
    const it=s.items[s.i]; if(!it){ view().innerHTML=header(s)+`<div class="q"><h2 style="margin-top:0">Session complete</h2><p class="score">${s.right} of ${s.done} graded answers right (${pct(s.right,s.done)}%)</p><div class="row"><button class="btn" id="again">Retry missed</button><button class="btn quiet" onclick="history.back()">Back to hub</button></div></div>`;
      $('#again').onclick=()=>{ const miss=s.items.filter(x=>s.miss&&s.miss.has(x.id)); if(!miss.length) return toast('Nothing missed.'); Session.startQuiz(miss,o); }; return; }
    const multi=it.answer.length>1;
    view().innerHTML=header(s,`<span class="muted">${s.i+1} / ${s.items.length}</span>`)+`<div class="progressline"><i style="width:${pct(s.i,s.items.length)}%"></i></div>
    <div class="q">${qMeta(it,s.cert)}<div class="stem">${md(it.stem)}</div>${multi?`<p class="muted small">Choose ${it.answer.length}.</p>`:''}
     <div id="opts">${it.options.map(op=>`<button class="opt" data-k="${op.key}"><span class="k">${op.key}</span><span>${md(op.text)}</span></button>`).join('')}</div>
     <div class="row" style="margin-top:12px" id="acts"></div><div id="fb"></div></div>`;
    const acts=$('#acts');
    const reveal=()=>{ s.answered=true; const ok=it.answer.length && s.sel.length===it.answer.length && s.sel.every(k=>it.answer.includes(k));
      $$('.opt').forEach(b=>{ const k=b.dataset.k; if(it.answer.includes(k)) b.classList.add('right'); else if(s.sel.includes(k)) b.classList.add('wrong'); b.disabled=true; });
      if(it.answer.length){ s.done++; if(ok) s.right++; else (s.miss=s.miss||new Set()).add(it.id); Store.record(it.id,ok); }
      $('#fb').innerHTML=(it.answer.length?`<p class="score" style="color:var(${ok?'--ok':'--bad'})">${ok?'Correct':'Not quite'} — answer ${it.answer.join(', ')}</p>`:`<p>No answer key yet. Did you get it right?</p>`)+(it.explanation?`<div class="expl">${md(it.explanation)}</div>`:'');
      acts.innerHTML=(it.answer.length?'':`<button class="btn quiet" id="sg1">I got it</button><button class="btn quiet" id="sg0">I missed it</button>`)+`<button class="btn quiet" id="flg">${Store.progress()[it.id]?.flag?'Unflag':'Flag'}</button><button class="btn" id="nx">Next question</button>`;
      if(!it.answer.length){ $('#sg1').onclick=()=>{Store.record(it.id,true,{selfGraded:true});next();}; $('#sg0').onclick=()=>{Store.record(it.id,false,{selfGraded:true});next();}; }
      $('#flg').onclick=()=>{ const f=Store.toggleFlag(it.id); $('#flg').textContent=f?'Unflag':'Flag'; };
      $('#nx').onclick=next; $('#nx').focus(); };
    const next=()=>{ s.i++; s.sel=[]; s.answered=false; s.render(); };
    $$('.opt').forEach(b=>b.onclick=()=>{ if(s.answered) return; const k=b.dataset.k;
      if(multi){ s.sel=s.sel.includes(k)?s.sel.filter(x=>x!==k):[...s.sel,k]; b.classList.toggle('sel'); acts.innerHTML=s.sel.length?'<button class="btn" id="sub">Check answer</button>':''; if(s.sel.length) $('#sub').onclick=reveal; }
      else { s.sel=[k]; reveal(); } });
    if(!it.answer.length && !multi){ acts.innerHTML='<button class="btn quiet" id="rv">Show explanation</button>'; $('#rv').onclick=reveal; }
  };
  Session.active=s; location.hash==='#/run'?s.render():go('#/run');
};

Session.startFlash=(items,o)=>{
  const s={title:o.title,cert:o.cert,items,i:0,flip:false};
  s.render=()=>{ const it=s.items[s.i]; if(!it){ view().innerHTML=header(s)+'<div class="q"><h2 style="margin-top:0">Deck finished</h2><button class="btn" onclick="history.back()">Back to hub</button></div>'; return; }
    const back=`<div class="side">Answer</div><div class="score">${it.answer.length?it.answer.map(k=>k+'. '+esc((it.options.find(o=>o.key===k)||{}).text||'')).join('<br>'):'No answer key yet'}</div>${it.explanation?`<div class="expl">${md(it.explanation)}</div>`:''}`;
    const front=`<div class="side">Question · click or press space to flip</div><div class="stem">${md(it.stem)}</div>${it.options.map(op=>`<div><b>${op.key}.</b> ${md(op.text)}</div>`).join('')}`;
    view().innerHTML=header(s,`<span class="muted">${s.i+1} / ${s.items.length}</span>`)+`<div class="progressline"><i style="width:${pct(s.i,s.items.length)}%"></i></div><div class="card" id="card" tabindex="0">${qMeta(it,s.cert)}${s.flip?back:front}</div>
     <div class="row" style="margin-top:12px">${s.flip?'<button class="btn quiet" id="m0">Missed it</button><button class="btn" id="m1">Knew it</button>':'<button class="btn" id="fl">Flip card</button>'}<button class="btn quiet" id="sk">Skip</button></div>`;
    const flip=()=>{s.flip=!s.flip;s.render();}; $('#card').onclick=flip; $('#card').onkeydown=e=>{if(e.key===' '){e.preventDefault();flip();}}; $('#card').focus();
    const nx=ok=>{ if(ok!=null) Store.record(it.id,ok,{selfGraded:!it.answer.length}); s.i++; s.flip=false; s.render(); };
    if($('#fl')) $('#fl').onclick=flip; if($('#m0')) {$('#m0').onclick=()=>nx(false); $('#m1').onclick=()=>nx(true);} $('#sk').onclick=()=>nx(null);
  };
  Session.active=s; location.hash==='#/run'?s.render():go('#/run');
};

Session.startPBQ=(items,idx,o)=>{
  const s={title:o.title,cert:o.cert,items,i:idx};
  s.render=()=>{ const it=s.items[s.i];
    view().innerHTML=header(s,`<div class="row"><button class="btn quiet" id="pv" ${s.i?'':'disabled'}>Previous lab</button><button class="btn quiet" id="nv" ${s.i<s.items.length-1?'':'disabled'}>Next lab</button></div>`)+'<div id="pbq"></div>';
    $('#pv').onclick=()=>{s.i--;s.render();}; $('#nv').onclick=()=>{s.i++;s.render();};
    PBQ.render($('#pbq'),it,{mode:'practice',onGrade:(sc)=>Store.record(it.id,sc>=80,{lastScore:sc})});
  };
  Session.active=s; location.hash==='#/run'?s.render():go('#/run');
};

Session.startExam=(items,o)=>{
  const s={title:o.cert.name+' exam simulation',cert:o.cert,items,i:0,ans:{},flag:new Set(),pbqState:{},end:Date.now()+o.minutes*60e3,start:Date.now(),minutes:o.minutes};
  const fmt=ms=>{ ms=Math.max(0,ms); const m=Math.floor(ms/60e3), x=Math.floor(ms%60e3/1e3); return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };
  s.render=()=>{
    const it=s.items[s.i];
    view().innerHTML=`<div class="examwrap"><div id="qa"></div><aside class="panel" style="position:sticky;top:12px"><div class="muted small">Time left</div><div class="timer" id="tm">${fmt(s.end-Date.now())}</div>
      <div class="muted small" style="margin-top:8px">${Object.keys(s.ans).length} of ${s.items.length} answered</div>
      <div class="navgrid">${s.items.map((x,j)=>`<button data-j="${j}" class="${s.ans[x.id]?'ans':''} ${s.flag.has(x.id)?'flag':''} ${j===s.i?'cur':''}" title="${x.kind==='pbq'?'PBQ':'Question'} ${j+1}">${x.kind==='pbq'?'P':''}${j+1}</button>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn danger" id="end">Submit exam</button></div></aside></div>`;
    $$('.navgrid button').forEach(b=>b.onclick=()=>{s.i=+b.dataset.j;s.render();});
    $('#end').onclick=()=>{ const left=s.items.length-Object.keys(s.ans).length; if(confirm(left?`${left} items unanswered. Submit anyway?`:'Submit the exam?')) finish(); };
    const qa=$('#qa'); const nav=`<div class="row" style="margin-top:14px"><button class="btn quiet" id="pv" ${s.i?'':'disabled'}>Previous</button><button class="btn quiet" id="fg">${s.flag.has(it.id)?'Unflag':'Flag for review'}</button><button class="btn" id="nx" ${s.i<s.items.length-1?'':'disabled'}>Next</button></div>`;
    if(it.kind==='pbq'){ qa.innerHTML=`<div class="meta"><span class="pill">PBQ ${s.i+1} of ${s.items.length}</span></div><div id="pbq"></div>`+nav;
      PBQ.render($('#pbq',qa),it,{mode:'exam',state:s.pbqState[it.id],onChange:(st,score)=>{ s.pbqState[it.id]=st; s.ans[it.id]={score}; const b=$(`.navgrid button[data-j="${s.i}"]`); b&&b.classList.add('ans'); }});
    } else {
      const sel=s.ans[it.id]?.sel||[]; const multi=it.answer.length>1;
      qa.innerHTML=`<div class="q"><div class="meta"><span class="pill">Question ${s.i+1} of ${s.items.length}</span></div><div class="stem">${md(it.stem)}</div>${multi?`<p class="muted small">Choose ${it.answer.length}.</p>`:''}${it.options.map(op=>`<button class="opt ${sel.includes(op.key)?'sel':''}" data-k="${op.key}"><span class="k">${op.key}</span><span>${md(op.text)}</span></button>`).join('')}</div>`+nav;
      $$('.opt',qa).forEach(b=>b.onclick=()=>{ let cur=(s.ans[it.id]?.sel)||[]; const k=b.dataset.k; cur=multi?(cur.includes(k)?cur.filter(x=>x!==k):[...cur,k]):[k]; s.ans[it.id]={sel:cur}; if(!cur.length) delete s.ans[it.id]; s.render(); });
    }
    $('#pv').onclick=()=>{s.i--;s.render();}; $('#nx').onclick=()=>{s.i++;s.render();};
    $('#fg').onclick=()=>{ s.flag.has(it.id)?s.flag.delete(it.id):s.flag.add(it.id); s.render(); };
  };
  const finish=()=>{
    clearInterval(Session.tick); const c=s.cert; let pts=0; const byD={}; const rows=[];
    s.items.forEach(it=>{ const d=examDomain(c,it); const b=byD[d]=byD[d]||{n:0,pts:0}; b.n++; let score=0;
      if(it.kind==='pbq'){ score=(s.ans[it.id]?.score||0)/100; Store.record(it.id,score>=.8,{lastScore:Math.round(score*100)}); }
      else { const sel=s.ans[it.id]?.sel||[]; const ok=sel.length===it.answer.length&&sel.every(k=>it.answer.includes(k)); score=ok?1:0; Store.record(it.id,ok); if(!ok) rows.push({it,sel}); }
      b.pts+=score; pts+=score; });
    const p=pct(pts,s.items.length); const scaled=Math.round(100+800*pts/s.items.length);
    const secs=Math.round((Date.now()-s.start)/1e3);
    Store.addExam({at:Date.now(),cert:c.id,total:s.items.length,pct:p,scaled,secs,byDomain:byD});
    Session.active={render:()=>{
      view().innerHTML=`<h1>Exam results</h1><p class="score" style="font-size:1.6rem;margin:0">${p}% <span class="muted" style="font-size:1rem">≈ ${scaled} on the 100–900 scale (rough estimate; CompTIA's scaling isn't public)</span></p>
      <p class="muted">${s.items.length} items in ${Math.round(secs/60)} minutes. Passing is ${esc(c.exam?.pass||'—')}.</p>
      <table class="list" style="max-width:700px"><tr><th>Domain</th><th>Items</th><th>Score</th></tr>${Object.entries(byD).map(([d,b])=>`<tr><td>${esc(d)}</td><td>${b.n}</td><td>${pct(b.pts,b.n)}%</td></tr>`).join('')}</table>
      <div class="row" style="margin:16px 0"><button class="btn" id="rv" ${rows.length?'':'disabled'}>Review ${rows.length} missed questions</button><a class="btn quiet" href="#/cert/${c.id}/exam">Back to ${esc(c.name)}</a></div>`;
      $('#rv').onclick=()=>Session.startQuiz(rows.map(r=>r.it),{title:'Missed in exam',cert:c});
    }}; Session.active.render();
  };
  Session.tick=setInterval(()=>{ const t=$('#tm'); const left=s.end-Date.now(); if(t){ t.textContent=fmt(left); t.classList.toggle('low',left<10*60e3);} if(left<=0){ alert('Time is up. Your exam is being scored.'); finish(); } },1000);
  Session.active=s; location.hash==='#/run'?s.render():go('#/run');
};

document.addEventListener('DOMContentLoaded',route);
})();
