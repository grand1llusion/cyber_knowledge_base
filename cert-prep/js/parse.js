/* Deck parsers. Accepts:
   1. certprep JSON (format certprep-deck/1 or certprep-pbq/1)
   2. CompTIA-style markdown blocks: "### Q12 · Domain" or "### Question 12 - [Domain]", options "A. ...", "Answer: A" / "**Answer:** A, C"
   3. WGU quiz-engine Test Bank dialect: "### A1. question", options on one line split by " · " with **bold** correct, "**Answer:**", "- ✅/❌" bullets
   4. WGU Simple dialect: "## Topic", "Q:" lines, "- option" with "*" on correct (or A)/1. labels + "Answer: C"), ">" or "Note:" explanation */
(function(){
  const L='ABCDEFGH';
  function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'deck'; }
  function frontmatter(t){
    const m=t.match(/^---\n([\s\S]*?)\n---\n?/); if(!m) return [{},t];
    const meta={}; m[1].split('\n').forEach(l=>{ const i=l.indexOf(':'); if(i>0) meta[l.slice(0,i).trim()]=l.slice(i+1).trim(); });
    return [meta,t.slice(m[0].length)];
  }
  function finish(meta, items, fname, kind){
    const title=meta.deck||meta.title||fname.replace(/\.[^.]+$/,'');
    const id=meta.id||slug((meta.cert?meta.cert+'-':'')+title);
    items.forEach((it,i)=>{ it.qid=it.qid||('Q'+(i+1)); it.id=id+'#'+it.qid; });
    return {id,title,cert:meta.cert||'',kind:kind||meta.kind||'mc',source:meta.source||fname,loadedAt:Date.now(),items};
  }
  function parseCompTIA(body){
    const parts=body.split(/^###\s+/m).slice(1); const items=[];
    for(const raw of parts){
      const nl=raw.indexOf('\n'); const head=raw.slice(0,nl<0?raw.length:nl).trim(); let rest=nl<0?'':raw.slice(nl+1);
      let qid, domain='';
      let m=head.match(/^Q(?:uestion)?\s*([A-Za-z]?\d+[a-z]?)\s*(?:[·\-–]\s*\[?([^\]]*)\]?)?/);
      if(m){ qid='Q'+m[1]; domain=(m[2]||'').trim(); } else { qid=head.slice(0,20); }
      rest=rest.replace(/^-{3,}\s*$/mg,'').replace(/^={5,}\s*$/mg,'');
      let examDomain=''; const xd=rest.match(/^\*\*Exam domain:\*\*\s*(.*)$/m); if(xd){ examDomain=xd[1].trim(); rest=rest.replace(xd[0],''); }
      let flags=[]; const fm=rest.match(/^\*\*Flags:\*\*\s*(.*)$/m); if(fm){ flags=fm[1].split(/\s*,\s*/).filter(Boolean); rest=rest.replace(fm[0],''); }
      let expl=''; const em=rest.match(/^\**Explanation\**:?\**\s*/m);
      if(em){ expl=rest.slice(em.index+em[0].length).trim(); rest=rest.slice(0,em.index); }
      let answer=[]; const am=rest.match(/^\**Answer:?\**:?[ \t]*([A-H](?:[ \t,&]*[A-H])*)\b.*$/m);
      if(am){ answer=am[1].replace(/[^A-H]/g,'').split(''); rest=rest.slice(0,am.index)+rest.slice(am.index+am[0].length); }
      const lines=rest.split('\n'); const stem=[]; const opts=[]; let cur=null;
      for(const ln of lines){
        const om=ln.trim().match(/^([A-H])[.)]\s+(.*)$/);
        if(om && (opts.length===L.indexOf(om[1]))){ cur={key:om[1],text:om[2].trim()}; opts.push(cur); continue; }
        if(cur){ if(ln.trim()) cur.text+=' '+ln.trim(); else cur=cur; } else stem.push(ln);
      }
      if(!opts.length) continue;
      items.push({qid,domain,examDomain:examDomain||undefined,stem:stem.join('\n').trim(),options:opts,answer,explanation:expl,flags});
    }
    return items;
  }
  function parseTestBank(body){
    const items=[]; let topic='';
    const blocks=body.split(/^(?=##\s|###\s)/m);
    for(const b of blocks){
      const h2=b.match(/^##\s+(?!#)(.*)/); if(h2){ topic=h2[1].trim(); continue; }
      const m=b.match(/^###\s+([A-Z]\d+)\.\s+([\s\S]*?)\n([^\n]*·[^\n]*)\n/); if(!m) continue;
      const opts=m[3].split(' · ').map((t,i)=>({key:L[i],text:t.replace(/\*\*/g,'').trim(),bold:/\*\*/.test(t)}));
      let answer=opts.filter(o=>o.bold).map(o=>o.key);
      const am=b.match(/\*\*Answer:\*\*\s*([^\n]*)/);
      if(!answer.length && am){ const t=am[1].replace(/\*\*/g,'').trim(); const hit=opts.find(o=>t.startsWith(o.text)||t.startsWith(o.key+')')||t===o.key); if(hit) answer=[hit.key]; }
      const expl=(b.match(/^- [✅❌].*$/mg)||[]).join('\n');
      const flags=[]; if(/^B/.test(m[1])) flags.push('generated'); if(b.includes('⚠️')) flags.push('currency-note');
      items.push({qid:m[1],domain:topic,stem:m[2].trim(),options:opts.map(({key,text})=>({key,text})),answer,explanation:expl,flags});
    }
    return items;
  }
  function parseSimple(body){
    const items=[]; let topic=''; let q=null;
    const push=()=>{ if(q&&q.options.length){ items.push(q);} q=null; };
    for(const raw of body.split('\n')){
      const ln=raw.trim();
      let m;
      if((m=ln.match(/^##\s+(.*)/))){ push(); topic=m[1]; continue; }
      if((m=ln.match(/^Q:\s*(.*)/)) || (!q || q.options.length) && ln.endsWith('?') && !/^[-*>]/.test(ln)){
        push(); q={qid:'Q'+(items.length+1),domain:topic,stem:m?m[1]:ln,options:[],answer:[],explanation:'',flags:[]}; continue; }
      if(!q) continue;
      if((m=ln.match(/^-\s+(\*?)\s*(.*)$/))){ const k=L[q.options.length]; let t=m[2]; let star=!!m[1]; if(t.endsWith('*')){star=true;t=t.slice(0,-1).trim();} q.options.push({key:k,text:t}); if(star) q.answer.push(k); continue; }
      if((m=ln.match(/^([A-H]|[1-8])[.)]\s+(.*)$/))){ const k=L[q.options.length]; q.options.push({key:k,text:m[2]}); continue; }
      if((m=ln.match(/^Answer:\s*([A-H1-8])/i))){ const a=m[1].toUpperCase(); q.answer=[/\d/.test(a)?L[+a-1]:a]; continue; }
      if((m=ln.match(/^(?:>|Note:)\s*(.*)/))){ q.explanation+=(q.explanation?'\n':'')+m[1]; continue; }
      if(ln && !q.options.length) q.stem+='\n'+ln;
    }
    push(); return items;
  }
  function parseText(text,fname){
    text=text.replace(/\r\n/g,'\n').replace(/^\uFEFF/,'').replace(/^\s+/,'');
    if(/^\s*\{/.test(text)) return parseJSON(JSON.parse(text),fname);
    const [meta,body]=frontmatter(text);
    let items;
    if(/^###\s+(Q\d|Question\s+\d)/m.test(body)) items=parseCompTIA(body);
    else if(/^###\s+[A-Z]\d+\.\s/m.test(body)) items=parseTestBank(body);
    else items=parseSimple(body);
    if(!items.length) throw new Error(fname+': no questions found. See FORMAT.md for the supported layouts.');
    return finish(meta,items,fname,'mc');
  }
  function parseJSON(o,fname){
    if(o.format==='certprep-backup/1') return {backup:o};
    if(o.format==='certprep-pbq/1'){ const d=finish(o,o.items||[],fname,'pbq'); d.items.forEach((it,i)=>{ it.qid=it.qid||it.code||('PBQ'+(i+1)); it.id=d.id+'#'+it.qid; }); return d; }
    if(o.format==='certprep-deck/1') return finish(o,(o.items||[]).map(it=>({...it,options:it.options.map((t,i)=>typeof t==='string'?{key:L[i],text:t}:t)})),fname,o.kind||'mc');
    if(o.format==='certprep-range/1') return {range:o};
    throw new Error(fname+': unknown JSON format. Expected certprep-deck/1, certprep-pbq/1 or certprep-range/1.');
  }
  window.Parse={parseText,slug};
})();
