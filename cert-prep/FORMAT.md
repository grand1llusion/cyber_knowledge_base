# Cert Prep Hub — deck format

The hub runs on decks: plain files you load into the browser. Decks never ship with the public site. Keep them in Drive under `Certifications/<cert>/decks/` and load them on any device.

A deck attaches to a certification through its `cert` value (e.g. `pt0-003`, `cs0-004`). Any code listed for that cert in `js/registry.js` works. Decks with no `cert` land in **My decks**.

## 1. Multiple-choice decks (Markdown)

Front matter is optional but recommended:

```markdown
---
format: certprep-deck/1
deck: PenTest+ PT0-003 · MC Part 1
cert: pt0-003
kind: mc
---

### Q12 · Attacks and Exploits

Question stem. Multiple lines are fine.

A. First option
B. Second option
C. Third option
D. Fourth option

**Exam domain:** Attacks and Exploits
**Answer:** B
**Explanation:**
Anything after this line until the next question.
**Flags:** claude-keyed, check-exhibit

---
```

* The header is `### Q<id> · <domain>`. The original bank form `### Question 12 - [Domain]` also works.
* Options run `A.` through `H.`. Multi-answer uses `**Answer:** A, C`.
* No `Answer` line means a **self-check** item: you see the explanation and grade yourself.
* `**Exam domain:**` overrides the domain used for mastery when the source tag comes from an older exam version.
* Flags the hub understands: `claude-keyed` (answer proposed by Claude — review it), `check-exhibit` (stem refers to an exhibit that may be missing), `ocr-fixed`, `self-check`.

Front matter `role: drill` marks a practice-only deck (for example a glossary drill): it shows up in Practice and Flashcards but never counts toward mastery or the exam simulation.

### WGU quiz-engine decks

Both dialects from the WGU quiz engine load unchanged:

* **Test Bank:** `### A1. question`, options on one line split by ` · ` with the correct one in **bold**, `**Answer:**`, then `- ✅/❌` rationale bullets.
* **Simple:** `## Topic` headings, `Q:` lines, `-` options with `*` on the correct one (or `A)` labels plus `Answer: C`), `>` or `Note:` for the explanation.

## 2. PBQ decks (JSON)

```json
{"format":"certprep-pbq/1","id":"pt0-003-pbq","deck":"PenTest+ · PBQ lab","cert":"pt0-003","items":[ PBQ, ... ]}
```

A PBQ is instructions + evidence on the left + graded parts on the right.

```json
{"qid":"Q42","title":"…","domain":"source tag","examDomain":"mapped domain",
 "instructions":"Supports **bold** and `code`.",
 "evidence":[ block, ... ],
 "parts":[ part, ... ],
 "explanation":"Shown after Check answers."}
```

**Evidence blocks**

| type | fields | use |
|---|---|---|
| `terminal` | `title`, `text` | command output, logs, code |
| `text` | `text` | a note |
| `table` | `title`, `header[]`, `rows[][]`, `mono` | tabular evidence |
| `tabs` | `title`, `tabs:[{label, blocks:[…]}]` | ticket tabs, multiple outputs |
| `nodes` | `title`, `hint`, `nodes:[{label, sub, zone, blocks:[…]}]` | click a server/device to inspect it |

**Graded parts** (each scores 0–100%; the lab score is the average)

| type | fields | notes |
|---|---|---|
| `choice` | `options[]`, `answer:[idx…]`, `multi`, `accept` | one answer = radio; several = checkboxes with partial credit. `multi:true` forces checkboxes (an empty `answer` means "select none"). `accept:[idx…]` lists alternative correct single answers. |
| `slots` | `bank[]`, `template:[text \| {slot:"label"}]`, `answer:[idx \| [idx…]]`, `reuse` | click-to-fill code or command builder. An array answer accepts any listed token. |
| `matrix` | `rowHeader`, `rows:[{label, code}]`, `columns:[{name, options[]}]`, `answer:[[optIdx \| [optIdx…] per column] per row]` | payload tables, device tables, dropdown sets |

## 3. Range scenarios (JS or JSON)

`certprep-range/1`: `zones`, `nodes` (with `services` and `tags`), `links`, `nse` (tag → script line), `domains`, and `objectives`. Each objective has `nodes` to light up and `steps`:

* `{teach:{h, body, tip}}`
* `{choice:{q, opts:[{l, n, set:{key:value}, ok, needTag}] | "zones-with-cidr"}}` — `set` writes to the walkthrough context; `ok` marks the best answer; `needTag` hides an option unless the target has that service tag.
* `{pick:{q, from:[nodeIds] | "zone", store}}` — choose a host on the map.
* `{run:{title, cases:[{when:{key:value}, cmd, out, note}]}}` or `{run:{title, gen:"nmap"}}` — the first case whose `when` matches runs. `{ip}`, `{label}`, `{os}` fill in from the chosen target. Output may use `<span class="ok|wn|cr|dm">`.
* `{done:"summary"}`

The PenTest+ range lives in `range/pt0-003.js`. A new scenario can ship in the repo (public content) or be dropped on the hub as a `.json` file (stays in your browser).

## 4. Study lessons (Markdown)

`certprep-study/1` decks drive the **Study** tab: short lessons, each with an exam trap and quick-check questions.

```markdown
---
format: certprep-study/1
kind: study
cert: pt0-003
id: pt0-003-study
title: PenTest+ study lessons
sections: 01=Before you begin; 02=Pre-engagement activities
---

## L01-01 · What penetration testing is · Other topic covered
tier: core | domain: Engagement Management | section: 01 | minutes: 3
kw: penetration test, vulnerability scan, authorized

Lesson body in ordinary Markdown: ### headings, lists, tables, code fences,
Obsidian callouts (> [!tip] Exam focus), **bold**, *italic*, `code`.

:::check
trap: The one-line exam trap shown under the lesson.
q: Which activity best distinguishes a penetration test?
- Using automated scanners
- *Exploiting findings to prove impact
- Producing a report
why: Explanation shown after answering.
:::
```

* `tier` is `core`, `likely` or `deep`. The Study tab shows Core by default; the other tiers are opt-in filters.
* `domain` must match one of the cert's exam domains. `minutes` is the reading estimate.
* `kw` drives **Practice related questions**: multiple-choice items that match at least two keywords.
* Each quick-check answer is recorded as `<deck>#<lesson>#qcN`; answering them all marks the lesson read.

## 5. Progress backups

Progress → Export writes `certprep-backup/1`. Drop it on any **Load decks** area to merge it on another device.
