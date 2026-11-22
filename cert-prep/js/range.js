/* Range module: topology + objective walkthroughs, driven by a certprep-range/1 scenario.
   Step kinds: teach{h,body,tip} | choice{q,opts[{l,n,set,ok,needTag}] | 'zones-with-cidr', store} | pick{q,from:[ids]|'zone',store} | run{title,cases[{when,cmd,out,note}] | gen:'nmap'} | done */
(function(){
const {esc}=window.UI;
const safe=s=>esc(s).replace(/&lt;span class=&quot;(ok|wn|cr|dm)&quot;&gt;/g,'<span class="$1">').replace(/&lt;\/span&gt;/g,'</span>');
function nmap(sc,node,depth,zoneCidr){
  const svc=node.services||[]; const pl=s=>`${String(s.p+'/'+(s.proto||'tcp')).padEnd(10)} open   ${s.n}${s.pr?'  '+s.pr:''}${s.vuln?'  <span class="cr">[weak config]</span>':(s.tags||[]).some(t=>t==='snmp-public'||t==='dns-axfr')?'  <span class="wn">[info leak]</span>':''}`;
  if(depth==='sweep') return {cmd:`nmap -sn ${zoneCidr||node.ip}`,out:`Starting Nmap 7.95\nNmap scan report for ${node.label} (${node.ip})\nHost is <span class="ok">up</span> (0.0012s latency).  <span class="dm"># ICMP / ARP responded</span>`,note:'Host discovery only — you know it is alive, nothing about services yet. This is the "how wide" pass.'};
  if(depth==='top100') return {cmd:`nmap --top-ports 100 ${node.ip}`,out:`Starting Nmap 7.95\nNmap scan report for ${node.label} (${node.ip})\nHost is up.\n\nPORT       STATE  SERVICE\n`+svc.map(s=>`${String(s.p+'/'+(s.proto||'tcp')).padEnd(10)} open   ${s.n}`).join('\n'),note:'Top-100 TCP: you see which ports answer, but no versions. Fast and quieter than a full scan.'};
  let out=`Starting Nmap 7.95\nNmap scan report for ${node.label} (${node.ip})\nHost is up (0.0015s latency).\n\nPORT       STATE  SERVICE / VERSION\n`+svc.map(pl).join('\n');
  if(depth==='deep'){ out+=`\n\n<span class="dm">OS detection:</span> ${node.os}  <span class="dm">(fingerprint match 96%)</span>`; const h=[]; svc.forEach(s=>(s.tags||[]).forEach(t=>sc.nse&&sc.nse[t]&&h.push(sc.nse[t]))); if(h.length) out+=`\n\n<span class="dm">NSE scripts (-sC):</span>\n`+h.map(x=>'  | '+x).join('\n'); }
  return {cmd:depth==='full'?`nmap -p- -sV ${node.ip}`:`nmap -p- -sV -sC -O ${node.ip}`,out,note:depth==='full'?'Full TCP + -sV: every open port with product/version — this is the fingerprint that drives exploit selection.':'Deep scan (-sV -sC -O): versions, OS guess, and NSE script findings. Loudest option — most likely to trip the IDS.'};
}
function render(el,sc,o){
  const N=Object.fromEntries(sc.nodes.map(n=>[n.id,n]));
  let cur=null, i=0, ctx={}, hot=new Set(), act=null, log=[];
  const internal=sc.nodes.filter(n=>n.services&&!['internet','cloud','edge'].includes(n.zone)).map(n=>n.id);
  el.innerHTML=`<p class="muted" style="max-width:80ch">${esc(sc.blurb||'')}</p><div class="range"><aside class="panel objlist" id="ol"></aside><div><div id="map"></div><div class="runner" id="rn"></div></div></div>
   <p class="muted small">Simulated lab. Outputs are illustrative, not live scans.</p>`;
  const ol=el.querySelector('#ol');
  ol.innerHTML=sc.domains.map(d=>`<div class="dom">${d.n}. ${esc(d.name)}</div>`+sc.objectives.filter(x=>x.dom===d.n).map(x=>`<button data-o="${x.num}"><span style="font-family:var(--mono)">${x.num}</span> ${esc(x.title)}${x.flagship?' ★':''}</button>`).join('')).join('');
  ol.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>start(b.dataset.o));
  const [W,H]=sc.viewBox||[1040,724];
  const draw=()=>{
    let s=`<svg class="topo" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sc.title)} topology">`;
    sc.zones.forEach(z=>s+=`<g class="zone"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10" fill="${z.color}" stroke="${z.color}"/><text x="${z.x+10}" y="${z.y+16}" fill="${z.color}">${esc(z.label)}${z.cidr?'  '+esc(z.cidr):''}</text></g>`);
    sc.links.forEach(([a,b,d])=>{ const p=N[a],q=N[b]; s+=`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" ${d?'stroke-dasharray="5 4"':''}/>`; });
    sc.nodes.forEach(n=>{ s+=`<g class="n ${hot.has(n.id)?'hot':''} ${act===n.id?'act':''}" data-n="${n.id}" transform="translate(${n.x},${n.y})" style="cursor:pointer" tabindex="0"><title>${esc(n.label)} · ${esc(n.ip)} · ${esc(n.os)}${n.note?' — '+esc(n.note):''}</title><rect x="-40" y="-18" width="80" height="34" rx="6"/><text text-anchor="middle" y="-2">${esc(n.label)}</text><text class="ip" text-anchor="middle" y="11">${esc(n.ip)}</text></g>`; });
    el.querySelector('#map').innerHTML=s+'</svg>';
    el.querySelectorAll('[data-n]').forEach(g=>{ const f=()=>nodeClick(g.dataset.n); g.onclick=f; g.onkeydown=e=>{if(e.key==='Enter')f();}; });
  };
  const nodeClick=id=>{ const st=cur&&cur.steps[i]; if(st&&st.pick){ const opts=pickOpts(st.pick); if(opts.includes(id)){ ctx[st.pick.store]=id; act=id; i++; step(); return; } }
    const n=N[id]; el.querySelector('#rn').innerHTML=`<div class="step"><h3>${esc(n.label)} <span class="muted" style="font-family:var(--mono);font-size:.85rem">${esc(n.ip)}</span></h3><p class="muted" style="margin:0">${esc(n.os)}${n.note?' · '+esc(n.note):''}</p>${n.services?`<div class="term" style="margin-top:10px">${n.services.map(s=>esc(s.p+'/'+(s.proto||'tcp')+'  '+s.n+(s.pr?'  '+s.pr:''))).join('\n')}</div>`:''}${cur?'<div class="row" style="margin-top:10px"><button class="btn quiet" id="bk">Back to the objective</button></div>':''}</div>`; const bk=el.querySelector('#bk'); if(bk) bk.onclick=step; };
  const pickOpts=p=>Array.isArray(p.from)?p.from:sc.nodes.filter(n=>n.zone===ctx.zone&&n.services).map(n=>n.id);
  const start=num=>{ cur=sc.objectives.find(x=>x.num===num); i=0; ctx={}; act=null; log=[];
    hot=new Set(cur.nodes==='all-internal'?internal:cur.nodes); ol.querySelectorAll('[data-o]').forEach(b=>b.classList.toggle('on',b.dataset.o===num)); draw(); step(); };
  const sub=s=>{ const n=N[ctx.target]||{}; return String(s||'').replace(/\{(ip|label|os)\}/g,(m,k)=>n[k]||m); };
  const step=()=>{
    const rn=el.querySelector('#rn'); const st=cur.steps[i];
    const head=`<div class="objhead"><span class="num">${cur.num}</span><h3 style="margin:0">${esc(cur.title)}</h3></div><p class="muted" style="margin:4px 0 0">${esc(cur.concept)}</p>`;
    const nav=(next=true)=>`<div class="row" style="margin-top:12px"><button class="btn quiet" id="rs">Restart</button>${next?'<button class="btn" id="nx">Next step</button>':''}<span class="muted small">Step ${Math.min(i+1,cur.steps.length)} of ${cur.steps.length}</span></div>`;
    let body='';
    if(!st){ body=`<p><b>On the exam:</b> ${esc(cur.exam)}</p><p class="muted small">Tools: ${cur.tools.map(esc).join(', ')}</p>`; rn.innerHTML=`<div class="step">${head}${log.join('')}${body}<div class="row"><button class="btn quiet" id="rs">Run it again</button></div></div>`; el.querySelector('#rs').onclick=()=>start(cur.num); return; }
    if(st.teach){ body=`<h4 style="margin:12px 0 4px">${esc(st.teach.h)}</h4><p style="margin:0;max-width:72ch">${esc(st.teach.body)}</p>${st.teach.tip?`<div class="tip"><b>Exam tip:</b> ${esc(st.teach.tip)}</div>`:''}`+nav(); }
    if(st.choice){ let opts=st.choice.opts; if(opts==='zones-with-cidr') opts=sc.zones.filter(z=>z.cidr).map(z=>({l:z.label,n:z.cidr,set:{zone:z.id}}));
      const node=N[ctx.target]; opts=opts.filter(op=>!op.needTag||(node&&(node.services||[]).some(s=>(s.tags||[]).includes(op.needTag))));
      body=`<p style="margin:12px 0 0"><b>${esc(st.choice.q)}</b></p><div class="choices">${opts.map((op,k)=>`<button data-c="${k}">${esc(op.l)}<small>${esc(op.n||'')}</small></button>`).join('')}</div>`+nav(false);
      rn.innerHTML=`<div class="step">${head}${log.join('')}${body}</div>`;
      rn.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ const op=opts[+b.dataset.c]; Object.assign(ctx,op.set||{}); if(op.set&&op.set.zone){ hot=new Set(sc.nodes.filter(n=>n.zone===op.set.zone&&n.services).map(n=>n.id)); draw(); }
        const anyOk=opts.some(x=>x.ok); log=[`<div class="tip" style="border-left-color:${anyOk?(op.ok?'var(--ok)':'var(--bad)'):'var(--brand)'}">${anyOk?(op.ok?'<b>Good call.</b> ':'<b>Not the best move.</b> '):'<b>Chosen:</b> '}${esc(op.l)} — ${esc(op.n||'')}</div>`]; i++; step(); });
      el.querySelector('#rs').onclick=()=>start(cur.num); return; }
    if(st.pick){ const opts=pickOpts(st.pick); hot=new Set(opts); draw();
      body=`<p style="margin:12px 0 0"><b>${esc(st.pick.q)}</b></p><div class="choices">${opts.map(id=>`<button data-p="${id}">${esc(N[id].label)}<small>${esc(N[id].ip)} · ${esc(N[id].os)}</small></button>`).join('')}</div>`+nav(false);
      rn.innerHTML=`<div class="step">${head}${log.join('')}${body}</div>`; rn.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>nodeClick(b.dataset.p)); el.querySelector('#rs').onclick=()=>start(cur.num); return; }
    if(st.run){ let r; if(st.run.gen==='nmap'){ const z=sc.zones.find(z=>z.id===ctx.zone); r=nmap(sc,N[ctx.target],ctx.depth,z&&z.cidr); act=ctx.target; draw(); }
      else r=(st.run.cases||[]).find(c=>!c.when||Object.entries(c.when).every(([k,v])=>ctx[k]===v))||st.run.cases[0];
      body=`<h4 style="margin:12px 0 6px">${esc(st.run.title)}</h4><div class="term"><div class="cmd">${esc(sub(r.cmd))}</div>${safe(sub(r.out))}</div>${r.note?`<p class="small" style="margin:8px 0 0;max-width:72ch">${esc(r.note)}</p>`:''}`+nav(); }
    if(st.done){ body=`<div class="tip" style="border-left-color:var(--ok)">${esc(st.done)}</div>`+nav(); }
    rn.innerHTML=`<div class="step">${head}${log.join('')}${body}</div>`; log=[];
    const nx=el.querySelector('#nx'); if(nx) nx.onclick=()=>{ i++; step(); }; el.querySelector('#rs').onclick=()=>start(cur.num);
  };
  draw(); el.querySelector('#rn').innerHTML='<div class="empty">Pick an objective on the left. The hosts it involves light up on the map, then the console walks through the technique.</div>';
}
window.RangeView={render};
})();
