/* Data-driven PBQ engine. A PBQ = instructions + evidence blocks + graded parts.
   Evidence: terminal | text | table | tabs{tabs:[{label,blocks}]} | nodes{nodes:[{label,sub,zone,blocks}]}
   Parts:    choice{options,answer[]} | slots{bank,template,answer[]} | matrix{rows,columns,answer[][]} */
(function(){
const {esc,md}=window.UI;
function block(b){
  if(!b) return '';
  switch(b.type){
    case 'terminal': return `<div class="term">${b.title?`<div class="hd">${esc(b.title)}</div>`:''}${esc(b.text)}</div>`;
    case 'text': return `<div class="pbq-inst" style="border-left-color:var(--line)">${md(b.text)}</div>`;
    case 'table': return `${b.title?`<h4>${esc(b.title)}</h4>`:''}<table class="matrix"><tr>${(b.header||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map(r=>`<tr>${r.map(c=>`<td class="${b.mono?'code':''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'tabs': { const id='t'+Math.random().toString(36).slice(2,8); return `<div data-tabs="${id}">${b.title?`<h4>${esc(b.title)}</h4>`:''}<div class="subtabs">${b.tabs.map((t,i)=>`<button class="${i?'':'on'}" data-ti="${i}">${esc(t.label)}</button>`).join('')}</div>${b.tabs.map((t,i)=>`<div data-tp="${i}" ${i?'hidden':''}>${(t.blocks||[]).map(block).join('')}</div>`).join('')}</div>`; }
    case 'nodes': return `<div data-nodes>${b.title?`<h4>${esc(b.title)}</h4>`:''}<div class="nodes">${b.nodes.map((n,i)=>`<button class="node" data-ni="${i}"><div class="z">${esc(n.zone||'')}</div><b>${esc(n.label)}</b><div class="small muted">${esc(n.sub||'')}</div></button>`).join('')}</div>${b.nodes.map((n,i)=>`<div data-np="${i}" hidden>${(n.blocks||[]).map(block).join('')}</div>`).join('')}<div data-nh class="muted small">${esc(b.hint||'Select a system to inspect it.')}</div></div>`;
  }
  return '';
}
function wireBlocks(root){
  root.querySelectorAll('[data-tabs]').forEach(w=>{ const bs=[...w.querySelectorAll(':scope > .subtabs [data-ti]')], ps=[...w.querySelectorAll(':scope > [data-tp]')];
    bs.forEach(b=>b.onclick=()=>{ bs.forEach(x=>x.classList.toggle('on',x===b)); ps.forEach(p=>p.hidden=p.dataset.tp!==b.dataset.ti); }); });
  root.querySelectorAll('[data-nodes]').forEach(w=>{ const bs=[...w.querySelectorAll(':scope > .nodes [data-ni]')], ps=[...w.querySelectorAll(':scope > [data-np]')];
    bs.forEach(b=>b.onclick=()=>{ bs.forEach(x=>x.classList.toggle('on',x===b)); ps.forEach(p=>p.hidden=p.dataset.np!==b.dataset.ni); const h=w.querySelector(':scope > [data-nh]'); if(h) h.hidden=true; }); });
}
function initState(it){ return {parts:it.parts.map(p=>p.type==='choice'?{sel:[]}:p.type==='slots'?{slots:p.answer.map(()=>null),pick:null}:{cells:p.rows.map(()=>p.columns.map(()=>''))})}; }
function scorePart(p,st){
  if(p.type==='choice'){ const a=p.answer; if(!a.length) return st.sel.length?0:1; if(p.accept&&!p.multi) return st.sel.length===1&&p.accept.includes(st.sel[0])?1:0; if(a.length===1&&!p.multi) return st.sel.length===1&&st.sel[0]===a[0]?1:0; const hit=st.sel.filter(x=>a.includes(x)).length, bad=st.sel.length-hit; return Math.max(0,(hit-bad)/a.length); }
  if(p.type==='slots'){ let ok=0; p.answer.forEach((a,i)=>{ const v=st.slots[i]; if(v!=null && (Array.isArray(a)?a.includes(v):v===a || p.bank[v]===p.bank[a])) ok++; }); return ok/p.answer.length; }
  if(p.type==='matrix'){ let ok=0,n=0; p.rows.forEach((r,i)=>p.columns.forEach((c,j)=>{ n++; const a=p.answer[i][j]; const v=st.cells[i][j]; if(v!==''&&(Array.isArray(a)?a.includes(+v):+v===a)) ok++; })); return ok/n; }
  return 0;
}
function render(el,it,opt){
  const st=opt.state?JSON.parse(JSON.stringify(opt.state)):initState(it); let checked=false;
  const total=()=>Math.round(100*it.parts.reduce((a,p,i)=>a+scorePart(p,st.parts[i]),0)/it.parts.length);
  const draw=()=>{
    el.innerHTML=`<div class="q" style="max-width:none"><div class="meta"><span class="pill">${esc(it.qid)}</span>${it.domain?`<span class="pill">${esc(it.domain)}</span>`:''}${it.source?`<span class="pill">${esc(it.source)}</span>`:''}</div>
      <h2 style="margin:0 0 10px">${esc(it.title)}</h2><div class="pbq-inst">${md(it.instructions||'')}</div>
      <div class="${(it.evidence||[]).length?'grid2':''}" style="align-items:start"><div>${(it.evidence||[]).map(block).join('')}</div><div>${it.parts.map((p,i)=>part(p,i)).join('')}</div></div>
      ${opt.mode==='practice'?`<div class="row" style="margin-top:12px"><button class="btn" id="chk">Check answers</button><button class="btn quiet" id="rst">Reset lab</button></div><div id="res"></div>`:''}</div>`;
    wireBlocks(el); wire();
    if(checked){ const sc=total(); el.querySelector('#res').innerHTML=`<p class="score" style="color:var(${sc>=80?'--ok':'--bad'})">Score: ${sc}%</p>${it.explanation?`<div class="expl">${md(it.explanation)}</div>`:''}`; }
  };
  const part=(p,i)=>{
    const s=st.parts[i]; const sc=checked?scorePart(p,s):null; const cls=checked?(sc===1?'right':'wrong'):'';
    let h=`<div class="part ${cls}"><h4>${esc(p.title||('Part '+(i+1)))}${checked?` — ${Math.round(sc*100)}%`:''}</h4>${p.prompt?`<p style="margin:0 0 8px">${md(p.prompt)}</p>`:''}${(p.evidence||[]).map(block).join('')}`;
    if(p.type==='choice'){ const multi=p.answer.length>1||p.multi; h+=`<div class="choice">${multi?`<p class="muted small">${p.multi?'Select all that apply (possibly none).':'Select '+p.answer.length+'.'}</p>`:''}${p.options.map((o,j)=>{ const on=s.sel.includes(j); const good=p.accept&&!p.multi?p.accept.includes(j):p.answer.includes(j); const c=checked?(good?'right':on?'wrong':''):''; return `<label class="${c}"><input type="${multi?'checkbox':'radio'}" name="p${i}" data-p="${i}" value="${j}" ${on?'checked':''} ${checked?'disabled':''}> <span>${md(o)}</span></label>`; }).join('')}</div>`; }
    if(p.type==='slots'){ const used=new Set(s.slots.filter(x=>x!=null)); let k=0;
      h+=`<div class="muted small">Pick an item, then click a slot. Click a filled slot to clear it.</div><div class="bank">${p.bank.map((t,j)=>`<button class="tok ${s.pick===j?'sel':''} ${!p.reuse&&used.has(j)?'used':''}" data-p="${i}" data-b="${j}" ${checked?'disabled':''}>${esc(t)}</button>`).join('')}</div>
      <div class="tpl">${p.template.map(t=>{ if(typeof t==='string') return esc(t); const n=k++; const v=s.slots[n]; const a=p.answer[n]; const ok=checked&&v!=null&&(Array.isArray(a)?a.includes(v):(v===a||p.bank[v]===p.bank[a]));
        return `<span class="slot ${v!=null?'filled':''} ${checked?(ok?'right':'wrong'):''}" data-p="${i}" data-s="${n}" tabindex="0">${v!=null?esc(p.bank[v]):'[ '+esc(t.slot)+' ]'}</span>`; }).join('')}</div>
      ${checked?`<div class="small" style="margin-top:6px"><b>Answer:</b> ${p.answer.map(a=>Array.isArray(a)?a.map(x=>esc(p.bank[x])).join(' or '):esc(p.bank[a])).join(' | ')}</div>`:''}`; }
    if(p.type==='matrix'){ h+=`<div style="overflow:auto"><table class="matrix"><tr><th>${esc(p.rowHeader||'')}</th>${p.columns.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr>${p.rows.map((r,ri)=>`<tr><td class="${r.code?'code':''}">${esc(r.label)}</td>${p.columns.map((c,ci)=>{ const v=s.cells[ri][ci]; const a=p.answer[ri][ci]; const ok=v!==''&&(Array.isArray(a)?a.includes(+v):+v===a);
        return `<td><select data-p="${i}" data-r="${ri}" data-c="${ci}" class="${checked?(ok?'right':'wrong'):''}" ${checked?'disabled':''}><option value="">Choose…</option>${c.options.map((o,oi)=>`<option value="${oi}" ${String(v)===String(oi)?'selected':''}>${esc(o)}</option>`).join('')}</select>${checked&&!ok?`<div class="small" style="color:var(--ok)">${esc(c.options[Array.isArray(a)?a[0]:a])}</div>`:''}</td>`; }).join('')}</tr>`).join('')}</table></div>`; }
    return h+'</div>';
  };
  const changed=()=>{ if(opt.onChange) opt.onChange(st,total()); };
  const wire=()=>{
    el.querySelectorAll('input[data-p]').forEach(x=>x.onchange=()=>{ const s=st.parts[+x.dataset.p]; const v=+x.value; if(x.type==='radio') s.sel=[v]; else s.sel=x.checked?[...s.sel,v]:s.sel.filter(y=>y!==v); changed(); });
    el.querySelectorAll('.tok').forEach(b=>b.onclick=()=>{ const s=st.parts[+b.dataset.p]; const j=+b.dataset.b; s.pick=s.pick===j?null:j; draw(); });
    el.querySelectorAll('.slot').forEach(b=>{ const act=()=>{ if(checked) return; const p=it.parts[+b.dataset.p], s=st.parts[+b.dataset.p], n=+b.dataset.s;
      if(s.pick!=null){ if(!p.reuse){ const prev=s.slots.indexOf(s.pick); if(prev>=0) s.slots[prev]=null; } s.slots[n]=s.pick; s.pick=null; } else s.slots[n]=null; changed(); draw(); };
      b.onclick=act; b.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }; });
    el.querySelectorAll('select[data-p]').forEach(x=>x.onchange=()=>{ st.parts[+x.dataset.p].cells[+x.dataset.r][+x.dataset.c]=x.value; changed(); });
    const chk=el.querySelector('#chk'); if(chk) chk.onclick=()=>{ checked=true; draw(); opt.onGrade&&opt.onGrade(total()); };
    const rst=el.querySelector('#rst'); if(rst) rst.onclick=()=>{ Object.assign(st,initState(it)); checked=false; draw(); };
  };
  draw();
}
window.PBQ={render,block,wireBlocks};
})();
