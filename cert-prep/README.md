# Cert Prep Hub

A static certification study hub: practice questions, flashcards, data-driven PBQ labs, timed exam simulation, domain-weighted mastery tracking and a reusable attack range.

* **Live:** https://grand1llusion.github.io/cyber_knowledge_base/cert-prep/
* **Content stays private.** The site ships with the engine, a range scenario and small sample decks only. Question banks live in Google Drive (`Education/Certifications/<cert>/decks/`) and are loaded into the browser with **Load decks**.
* **Works offline** — open `index.html` from disk; everything except the sample-deck button and web fonts works over `file://`.

## Adding a certification

1. Add an entry to `js/registry.js` (id, codes, exam length, domains and weights, aliases for older domain names).
2. Write decks in the format described in [FORMAT.md](FORMAT.md) and keep them in Drive.
3. Optional: add a range scenario under `range/` and set `range:` on the cert.

## Files

| Path | Role |
|---|---|
| `index.html` | shell |
| `js/registry.js` | certifications and exam domains |
| `js/store.js` | localStorage persistence, backup export/import |
| `js/parse.js` | Markdown/JSON deck parsers (incl. WGU quiz-engine dialects) |
| `js/app.js` | hub, cert pages, practice, flashcards, exam simulation |
| `js/pbq.js` | PBQ engine |
| `js/range.js` | range engine |
| `range/pt0-003.js` | PenTest+ "Meridian Dynamics" scenario |
| `samples/` | public sample decks |
