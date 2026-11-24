/* Study tab: micro-lessons (certprep-study/1 decks), a safe markdown renderer, quick checks. */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=UI.esc;
const TIERS=[['core','Core'],['likely','Likely'],['deep','Deep']];
const TIER_NOTE={core:'Core: tested often. Learn these first.',likely:'Likely: shows up regularly, worth a pass after Core.',deep:'Deep: background or rarely tested.'};

/* ---------- markdown (escape first, then a small allow-list of constructs) ---------- */
function inl(s){
  const codes=[]; let t=esc(s).replace(/`([^`]+)`/g,(m,c)=>{ codes.push(c); return '\u0000'+(codes.length-1)+'\u0000'; });
  t=t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(m,a,b)=>b||a)
     .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
     .replace(/\*\*(\S(?:.*?\S)?)\*\*/g,'<b>$1</b>')
     .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![\w*])/g,'$1<i>$2</i>')
     .replace(/\u0000(\d+)\u0000/g,(m,i)=>'<code>'+codes[+i]+'</code>');
  return t;
}
const LI=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const isRow=l=>/^\s*\|.*\|\s*$/.test(l);
function cells(l){ return l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()); }
function render(src){
  const L=String(src||'').replace(/\r/g,'').split('\n'); const out=[]; let i=0;
  const starts=l=>/^```/.test(l)||/^#{1,6}\s/.test(l)||/^>/.test(l)||LI.test(l)||isRow(l)||/^\s*-{3,}\s*$/.test(l);
  while(i<L.length){
    const l=L[i]; let m;
    if(!l.trim()){ i++; continue; }
    if(/^```/.test(l)){ const b=[]; i++; while(i<L.length&&!/^```/.test(L[i])) b.push(L[i++]); i++; out.push(`<pre class="code"><code>${esc(b.join('\n'))}</code></pre>`); continue; }
    if((m=l.match(/^(#{1,6})\s+(.*)$/))){ const lv=m[1].length<=3?3:4; out.push(`<h${lv}>${inl(m[2])}</h${lv}>`); i++; continue; }
    if(/^\s*-{3,}\s*$/.test(l)){ out.push('<hr>'); i++; continue; }
    if(/^>/.test(l)){ const b=[]; while(i<L.length&&/^>/.test(L[i])) b.push(L[i++].replace(/^>\s?/,''));
      const cm=(b[0]||'').match(/^\[!(\w+)\]\s*(.*)$/);
      if(cm){ const type=cm[1].toLowerCase(); const title=cm[2]||type[0].toUpperCase()+type.slice(1); b.shift();
        out.push(`<div class="co ${esc(type)}"><div class="ct">${inl(title)}</div>${render(b.join('\n'))}</div>`); }
      else out.push(`<blockquote>${render(b.join('\n'))}</blockquote>`);
      continue; }
    if(isRow(l)){ const rows=[]; while(i<L.length&&isRow(L[i])) rows.push(L[i++]);
      const sep=rows.length>1&&/^\s*\|?[\s:|-]+\|?\s*$/.test(rows[1]); const head=sep?cells(rows[0]):null; const body=(sep?rows.slice(2):rows).map(cells);
      out.push(`<div class="tblwrap"><table>${head?`<thead><tr>${head.map(c=>`<th>${inl(c)}</th>`).join('')}</tr></thead>`:''}<tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue; }
    if(LI.test(l)){ const items=[];
      while(i<L.length){ const x=L[i];
        if((m=x.match(LI))){ items.push({ind:m[1].replace(/\t/g,'    ').length,ord:/\d/.test(m[2]),text:m[3]}); i++; continue; }
        if(!x.trim()){ let j=i+1; while(j<L.length&&!L[j].trim()) j++; if(j<L.length&&LI.test(L[j])&&/^\s+/.test(L[j])){ i=j; continue; } break; }
        if(/^\s+\S/.test(x)&&items.length){ items[items.length-1].text+=' '+x.trim(); i++; continue; }
        break; }
      let h=''; const st=[];
      for(const it of items){
        while(st.length&&it.ind<st[st.length-1].ind) h+='</li></'+st.pop().tag+'>';
        const top=st[st.length-1];
        if(!top||it.ind>top.ind){ const tag=it.ord?'ol':'ul'; st.push({ind:it.ind,tag}); h+='<'+tag+'>'; } else h+='</li>';
        h+='<li>'+inl(it.text);
      }
      while(st.length) h+='</li></'+st.pop().tag+'>';
      out.push(h); continue; }
    const p=[]; while(i<L.length&&L[i].trim()&&!(p.length&&starts(L[i]))) p.push(L[i++].trim());
    out.push(`<p>${inl(p.join(' '))}</p>`);
  }
  return out.join('\n');
}

/* ---------- data ---------- */
const lessonsFor=cid=>Hub.itemsFor(cid,'study');
const studyDecks=cid=>Hub.decksFor(cid).filter(d=>d.kind==='study');
function sectionName(cid,sec){ for(const d of studyDecks(cid)){ if(d.sections&&d.sections[sec]) return d.sections[sec]; } return 'Module '+sec; }
function st(l,P){ const r=P[l.id]; const q=l.checks.map((_,n)=>P[l.id+'#qc'+(n+1)]);
  const read=!!(r&&r.read); const ok=q.filter(x=>x&&x.lastOk).length;
  return {read, tried:q.filter(Boolean).length, ok, solid:read&&q.length>0&&ok===q.length}; }
const tiersOn=()=>{ const t=Store.prefs().studyTiers; return Array.isArray(t)&&t.length?t:['core']; };
const fmtMin=m=>m>=60?`${Math.floor(m/60)} h ${m%60?(m%60)+' min':''}`.trim():m+' min';
function nextUp(ls,P,tiers){ return ls.find(l=>tiers.includes(l.tier)&&!st(l,P).read) || ls.find(l=>tiers.includes(l.tier)&&!st(l,P).solid) || null; }
const relCache={};
function related(cid,l){
  if(relCache[l.id]) return relCache[l.id];
  const rx=l.kw.filter(k=>k.length>=3).map(k=>new RegExp('(^|[^a-z0-9])'+k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])'));
  const hits=Hub.itemsFor(cid,'mc').filter(Hub.keyed).map(i=>{ const t=(i.stem+' '+i.options.map(o=>o.text).join(' ')+' '+(i.explanation||'')).toLowerCase(); return [i,rx.reduce((a,r)=>a+(r.test(t)?1:0),0)]; })
    .filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,20).map(x=>x[0]);
  return relCache[l.id]=hits;
}

/* ---------- overview summary ---------- */
function summary(c){
  const ls=lessonsFor(c.id); if(!ls.length) return '';
  const P=Store.progress(); const core=ls.filter(l=>l.tier==='core'); const read=core.filter(l=>st(l,P).read).length; const nx=nextUp(ls,P,['core']);
  return `<div class="panel row studysum" style="justify-content:space-between;margin-bottom:18px"><div><b>Study</b> · Core lessons read: ${read} of ${core.length}<div class="muted small">${nx?`Next up: ${esc(nx.qid)} ${esc(nx.short)} (${nx.minutes} min)`:'Core path complete. Likely and Deep lessons are optional.'}</div></div>
    <div class="row">${nx?`<a class="btn" href="#/study/${c.id}/${encodeURIComponent(nx.qid)}">Continue studying</a>`:''}<a class="btn quiet" href="#/cert/${c.id}/study">All lessons</a></div></div>`;
}

/* ---------- study tab ---------- */
function tab(c,el){
  const ls=lessonsFor(c.id);
  if(!ls.length){ el.innerHTML=`<div class="empty">No study lessons loaded for ${esc(c.name)}. On the Overview tab, load <code>${esc(c.id)}-study.md</code> from your Drive folder <b>Certifications / ${esc(c.vendor)}_${esc(c.name)} / decks</b>.</div>`; return; }
  const P=Store.progress(); const tiers=tiersOn();
  const core=ls.filter(l=>l.tier==='core'); const S=ls.map(l=>[l,st(l,P)]);
  const coreRead=core.filter(l=>st(l,P).read).length, coreSolid=core.filter(l=>st(l,P).solid).length;
  const left=core.filter(l=>!st(l,P).read).reduce((a,l)=>a+(l.minutes||5),0);
  const nx=nextUp(ls,P,tiers);
  const mods=[...new Set(ls.map(l=>l.section))];
  el.innerHTML=`<div class="studyhead">
     <div><h2 style="margin:0 0 4px">Core path</h2><p class="muted small" style="margin:0;max-width:62ch">${core.length} Core lessons, about ${fmtMin(core.reduce((a,l)=>a+(l.minutes||5),0))} in total. Each one is a short read, the exam trap to watch for, and a quick check. Do these first; Likely and Deep lessons are optional.</p></div>
     <div class="studystat"><div><b>${coreRead}</b>/${core.length} read</div><div><b>${coreSolid}</b> with every quick check right</div><div class="muted small">${left?`≈ ${fmtMin(left)} of Core left`:'Core finished'}</div></div></div>
   <div class="track" aria-label="Core lessons by module. Filled squares are read, dark squares have every quick check right.">${mods.map(sec=>{ const cs=core.filter(l=>l.section===sec); if(!cs.length) return '';
      return `<div class="trk"><span class="lbl">${esc(sec)}</span>${cs.map(l=>{ const s=st(l,P); return `<a class="cell${s.solid?' solid':s.read?' read':''}${nx&&nx.id===l.id?' next':''}" href="#/study/${c.id}/${encodeURIComponent(l.qid)}" title="${esc(l.qid+' '+l.short)}${s.solid?' (solid)':s.read?' (read)':''}"></a>`; }).join('')}</div>`; }).join('')}</div>
   <div class="row" style="margin:6px 0 22px">${nx?`<a class="btn" href="#/study/${c.id}/${encodeURIComponent(nx.qid)}">Next up: ${esc(nx.qid)} ${esc(nx.short)} · ${nx.minutes} min</a>`:'<span class="pill ok">Everything in the selected tiers is done</span>'}</div>
   <div class="row chips" role="group" aria-label="Lesson tiers to show"><span class="muted small">Show</span>${TIERS.map(([k,n])=>`<button class="chip" aria-pressed="${tiers.includes(k)}" data-t="${k}" title="${esc(TIER_NOTE[k])}">${n} <span class="muted">${ls.filter(l=>l.tier===k).length}</span></button>`).join('')}</div>
   ${mods.map(sec=>{ const rows=S.filter(([l])=>l.section===sec&&tiers.includes(l.tier)); if(!rows.length) return '';
     return `<h3 class="modh">${esc(sec)} · ${esc(sectionName(c.id,sec))}</h3><table class="list lessons">${rows.map(([l,s])=>`<tr class="${s.read?'done':''}"><td style="width:22px"><span class="cell sm${s.solid?' solid':s.read?' read':''}" aria-label="${s.solid?'Solid':s.read?'Read':'Not read'}"></span></td>
        <td style="width:62px" class="mono small">${esc(l.qid)}</td><td><a href="#/study/${c.id}/${encodeURIComponent(l.qid)}">${esc(l.short)}</a><div class="muted small">${esc(l.domain||'')}</div></td>
        <td style="width:70px"><span class="pill tier-${esc(l.tier)}">${esc(l.tier[0].toUpperCase()+l.tier.slice(1))}</span></td><td style="width:60px" class="small muted">${l.minutes||5} min</td>
        <td style="width:110px" class="small muted">${s.tried?`Checks ${s.ok}/${l.checks.length}`:''}</td></tr>`).join('')}</table>`; }).join('')}`;
  $$('[data-t]',el).forEach(b=>b.onclick=()=>{ let t=tiersOn().slice(); const k=b.dataset.t; t=t.includes(k)?t.filter(x=>x!==k):[...t,k]; if(!t.length) t=['core']; Store.setPref('studyTiers',TIERS.map(x=>x[0]).filter(x=>t.includes(x))); tab(c,el); });
}

/* ---------- lesson page ---------- */
Hub.routes.study=([cid,lid])=>{
  const c=Hub.certFor(cid); if(!c) return Hub.go('#/');
  const ls=lessonsFor(c.id); const idx=ls.findIndex(l=>l.qid===decodeURIComponent(lid||''));
  if(idx<0) return Hub.go(`#/cert/${c.id}/study`);
  const l=ls[idx]; const P=Store.progress(); const s=st(l,P); const tiers=tiersOn();
  const pick=dir=>{ for(let j=idx+dir;j>=0&&j<ls.length;j+=dir){ if(tiers.includes(ls[j].tier)) return ls[j]; } return null; };
  const prev=pick(-1), next=pick(1); const rel=related(c.id,l);
  const subs=l.title.split(' · ').slice(1).filter(x=>x!=='…');
  const shuffled=l.checks.map(q=>UI.shuffle(q.options));
  Hub.view().innerHTML=`<p class="small"><a href="#/cert/${c.id}/study">${esc(c.name)} study</a> · ${esc(l.section)} ${esc(sectionName(c.id,l.section))}</p>
    <h1>${esc(l.short)}</h1>
    <div class="row" style="margin:6px 0 4px"><span class="pill mono">${esc(l.qid)}</span><span class="pill tier-${esc(l.tier)}" title="${esc(TIER_NOTE[l.tier]||'')}">${esc(l.tier[0].toUpperCase()+l.tier.slice(1))}</span><span class="pill">${esc(l.domain||'')}</span><span class="pill">${l.minutes||5} min</span>${s.read?'<span class="pill ok">Read</span>':''}</div>
    ${subs.length?`<p class="muted small" style="margin:4px 0 16px">Also covers: ${subs.map(esc).join(', ')}</p>`:'<div style="height:12px"></div>'}
    <article class="lesson">${render(l.body)}</article>
    ${l.trap?`<aside class="trap"><b>Exam trap</b><p style="margin:4px 0 0">${inl(l.trap)}</p></aside>`:''}
    ${l.checks.length?`<h2>Quick check</h2><div id="qcs">${l.checks.map((q,n)=>`<div class="q qc" data-n="${n}"><div class="stem">${UI.md(q.q)}</div>${shuffled[n].map((op,j)=>`<button class="opt" data-k="${op.key}"><span class="k">${'ABCDEFGH'[j]}</span><span>${UI.md(op.text)}</span></button>`).join('')}<div class="fb"></div></div>`).join('')}</div>`:''}
    <div class="row lessonnav">
      ${prev?`<a class="btn quiet" href="#/study/${c.id}/${encodeURIComponent(prev.qid)}" title="${esc(prev.qid+' '+prev.short)}">Previous</a>`:''}
      <button class="btn quiet" id="rd">${s.read?'Mark as unread':'Mark as read'}</button>
      ${rel.length?`<button class="btn quiet" id="rel">Practice ${rel.length} related questions</button>`:''}
      ${next?`<a class="btn" href="#/study/${c.id}/${encodeURIComponent(next.qid)}">Next: ${esc(next.qid)} ${esc(next.short)}</a>`:`<a class="btn" href="#/cert/${c.id}/study">Back to lessons</a>`}
    </div>`;
  const qcd=new Set();
  $$('.qc').forEach(box=>{ const n=+box.dataset.n; const q=l.checks[n];
    $$('.opt',box).forEach(b=>b.onclick=()=>{ if(qcd.has(n)) return; qcd.add(n); const ok=q.answer.includes(b.dataset.k);
      $$('.opt',box).forEach(x=>{ if(q.answer.includes(x.dataset.k)) x.classList.add('right'); else if(x===b) x.classList.add('wrong'); x.disabled=true; });
      $('.fb',box).innerHTML=`<p class="score" style="color:var(${ok?'--ok':'--bad'});margin:10px 0 0">${ok?'Correct':'Not quite'}</p>${q.why?`<div class="expl">${UI.md(q.why)}</div>`:''}`;
      Store.record(l.id+'#qc'+(n+1),ok);
      if(qcd.size===l.checks.length&&!Store.progress()[l.id]?.read){ Store.markRead(l.id,true); $('#rd').textContent='Mark as unread'; UI.toast('Lesson marked as read'); }
    }); });
  $('#rd').onclick=()=>{ const on=!Store.progress()[l.id]?.read; Store.markRead(l.id,on); $('#rd').textContent=on?'Mark as unread':'Mark as read'; UI.toast(on?'Marked as read':'Marked as unread'); };
  if($('#rel')) $('#rel').onclick=()=>Session.startQuiz(UI.shuffle(rel),{title:`Related to ${l.qid} ${l.short}`,cert:c});
};

window.StudyView={tab,summary,render,inl};
})();
