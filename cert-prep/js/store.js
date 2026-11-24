/* Persistence: decks + progress in localStorage (per-browser). Export/import JSON bridges devices. */
(function(){
  const K = {session:'cph.session.v1', decks:'cph.decks.v1', prog:'cph.progress.v1', exams:'cph.exams.v1', prefs:'cph.prefs.v1'};
  function rd(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
  function wr(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ alert('Browser storage is full or blocked. Remove a deck on the Decks page, or export progress first.'); return false; } }
  const S = {
    decks(){ return rd(K.decks,{}); },
    deckList(){ return Object.values(S.decks()).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true})); },
    putDeck(d){ const all=S.decks(); all[d.id]=d; return wr(K.decks,all); },
    delDeck(id){ const all=S.decks(); delete all[id]; wr(K.decks,all); },
    progress(){ return rd(K.prog,{}); },
    record(itemId, ok, extra){
      const p=S.progress(); const r=p[itemId]||{seen:0,right:0,wrong:0,box:1};
      r.seen++; if(ok) {r.right++; r.box=Math.min(5,(r.box||1)+1);} else {r.wrong++; r.box=1;}
      r.last=Date.now(); r.lastOk=!!ok; r.due=Date.now()+[0,0,1,3,7,21][r.box]*864e5;
      if(extra) Object.assign(r,extra);
      p[itemId]=r; wr(K.prog,p); return r;
    },
    markRead(itemId,on){ const p=S.progress(); const r=p[itemId]||{seen:0,right:0,wrong:0,box:1}; if(on) r.read=Date.now(); else delete r.read; r.last=Date.now(); p[itemId]=r; wr(K.prog,p); },
    toggleFlag(itemId){ const p=S.progress(); const r=p[itemId]||{seen:0,right:0,wrong:0,box:1}; r.flag=!r.flag; p[itemId]=r; wr(K.prog,p); return r.flag; },
    exams(){ return rd(K.exams,[]); },
    addExam(e){ const a=S.exams(); a.unshift(e); wr(K.exams,a.slice(0,100)); },
    session(){ return rd(K.session,null); },
    saveSession(o){ try{ localStorage.setItem(K.session,JSON.stringify(o)); }catch(e){} },
    clearSession(){ try{ localStorage.removeItem(K.session); }catch(e){} },
    prefs(){ return rd(K.prefs,{}); },
    setPref(k,v){ const p=S.prefs(); p[k]=v; wr(K.prefs,p); },
    exportAll(includeDecks){ return {format:'certprep-backup/1', at:new Date().toISOString(), progress:S.progress(), exams:S.exams(), prefs:S.prefs(), decks: includeDecks?S.decks():undefined}; },
    importAll(o){
      if(!o||o.format!=='certprep-backup/1') throw new Error('Not a Cert Prep backup file.');
      const p=S.progress(); for(const [k,v] of Object.entries(o.progress||{})){ if(!p[k]||(v.last||0)>(p[k].last||0)) p[k]=v; } wr(K.prog,p);
      const ex=S.exams(); const seen=new Set(ex.map(e=>e.at)); (o.exams||[]).forEach(e=>{ if(!seen.has(e.at)) ex.push(e); }); ex.sort((a,b)=>b.at-a.at); wr(K.exams,ex);
      if(o.decks){ const d=S.decks(); Object.assign(d,o.decks); wr(K.decks,d); }
    }
  };
  window.Store=S;
})();
