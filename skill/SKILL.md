---
name: doc
description: |
  Conversational HTML doc builder. The user's primary interface is natural
  language — they never have to type slash commands. This skill auto-invokes
  whenever the user expresses intent to create, build, extend, edit, or
  reshape an HTML/interactive document. The agent recognizes intent, routes
  silently to the right internal verb (new/add/edit/remove/show/render/replay/freeze),
  edits the live doc folder (index.html + style.css + runtime.js +
  doc-source.json + data/ + assets/), appends an event to the manifest, and
  reports back in plain English. The doc folder is the source of truth, not
  a markdown file. Every doc must hit all five axes — interactive,
  computational, aesthetic, warm, originality — and per-event invention is
  the default.

  ALWAYS auto-invoke this skill when the user expresses any of these
  intents, with or without an explicit /doc:
    - "create an HTML doc for X" / "make me a doc about X" / "I want to
      write a doc for X" / "start a new doc" / "let's build a vision doc"
    - "add a chart from this CSV" / "chart this data" / "throw in a
      diagram" / "add a section about X" / "include this image" / "now add Y"
    - "change the chart to a line" / "rephrase the intro" / "move the
      footer above the chart" / "make X look different"
    - "remove the third callout" / "drop that section" / "get rid of Y"
    - "open the doc" / "show me what it looks like" / "let me see"
    - "flatten this for sharing" / "single file please" / "make it portable"
    - "rebuild from the log" / "replay the events"
    - Or any direct invocation: "/doc", "/doc new", "/doc add", etc.

  Proactively invoke when the user is mid-thought building a document piece
  by piece, especially if they mention HLDs, LLDs, vision docs, design
  notes, learning notes, performance reports, or any thinking-shaped artifact.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# /doc — render natural-language intent into an interactive HTML doc folder

This is the renderer-agent skill from [`inkling`](https://github.com/MeetVys/inkling).
Design philosophy: see `DESIGN.md` in the inkling repo for the full set of
principles, contracts, and schemas. Live tutorial:
[https://meetvys.github.io/inkling/](https://meetvys.github.io/inkling/).

Style and behavioral references — read at least one before rendering a new doc:
- The inkling repo's `docs/index.html` (the tutorial) — example of a chassis
  invented from first principles (conversation-spine).
- `docs/examples/vision/` in the inkling repo — example of a prose-with-sections
  chassis on the warm-notebook tokens.
- `docs/examples/doc-explained/` in the inkling repo — example of a learning doc
  with computational behaviors (inline charts, glossary popovers, click-to-explain).

These are references for vocabulary, not files to copy.

## The four pillars

Every artifact must hit all four. This is **Premise 4** of the design doc; treat
it as a contract, not a vibe.

1. **Interactive** — the doc reacts. Click-to-explain, decision walkthroughs,
   drawers, hover-to-reveal, scroll-spy, focus mode, glossary popovers.
2. **Computational** — the doc computes. Parses CSV/JSON inline and renders
   charts. Walks decision trees from source data. Highlights glossary terms
   dynamically. Runs small bits of inline code where appropriate.
3. **Aesthetic** — typographic care, layout discipline, restraint, visual
   hierarchy. The warm-notebook palette handles this for free *only on
   prose-heavy parts*. Computational sections must be designed to fit it.
4. **Warm** — calm, serious, archive-worthy, inviting to reopen. Paper tones,
   serif display, gentle interaction, no chrome-junk.

No tradeoff between any pair. A slick CSS render with no real interaction
failed the kit. A doc that interacts and computes but feels cold failed the
kit. **Hit all four, every render.** Self-audit before declaring done.

## Operating model: conversational, folder-as-source-of-truth

This skill is **not a one-shot renderer**. The default mode is conversational
and append-as-you-go: the user starts a doc and grows it across many turns
(`new`, then `add`, `add`, `edit`, `remove`, ...). The agent edits the live
HTML doc folder on every turn. The folder *is* the document — there is no
canonical markdown source.

The `render <source.md>` verb is kept as a convenience seed for cases where
draft prose already exists, but it is not the canonical entry path.

## Verbs

| verb | shape | what it does |
| --- | --- | --- |
| `/doc new "<title>"` | start a doc | Creates an empty doc folder with a minimal scaffold (skeleton `index.html`, baseline `style.css` tokens, baseline `runtime.js` chrome only, manifest with empty `events`). Chassis is **not** decided yet; it gets designed on the first real content add. |
| `/doc add "<instruction>"` | append content | Freeform instruction. Examples: *"section about Q1 perf"*, *"this CSV → bar chart"*, *"footer with my name and the date"*, *"insert this image after the chart"*. Agent interprets, edits whichever files need editing, records an event. |
| `/doc edit "<instruction>"` | modify existing content | *"Make the chart show a line not bars"*, *"rephrase the intro"*, *"move the footer above the chart"*. |
| `/doc remove "<target>"` | drop content | *"Remove the third callout"*, *"remove the footer"*. |
| `/doc show` | open in browser | `open <current-doc>/index.html`. |
| `/doc render <source.md>` | seed from markdown | Convenience. Renders an existing markdown file as the starting state of a new conversational doc; subsequent edits continue from there. |
| `/doc replay [<slug>]` | rebuild from event log | Deterministically reconstructs the folder from `events[]`. Used after manual edits or to verify the log is lossless. |
| `/doc freeze [<slug>]` | flatten for sharing | Produces a single self-contained `.html` from the doc folder. Original untouched. |

### Current-doc state

The most recently touched doc folder is the implicit target of `add`, `edit`,
`remove`, `show`, `replay`, `freeze`. The pointer lives at:

```
<project-root>/.current-doc
```

(plain text, contains the absolute path to the doc folder).

Explicit override on any verb: `--to <doc-slug>` or `--to <absolute-path>`.

Always update `.current-doc` after a successful `new` or after operating on
an explicit `--to` target.

## When the user invokes this (natural language is the interface)

**The user never has to type a slash command.** The slash command verbs
(`new`, `add`, `edit`, `remove`, etc.) are this skill's internal mechanics
for state changes — they are not the user's interface. The user's interface
is whatever they would naturally say to a collaborator.

### Intent recognition (map natural language to internal verb)

Listen for intent. Map to a verb. Execute. Report in plain English. Never
demand the user type the verb.

| User says (natural language) | Internal verb | Notes |
| --- | --- | --- |
| "create an HTML doc for X", "make me a doc about X", "let's start a vision doc", "I want to write an HLD on X", "build me a learning note on Y" | `new` | Title comes from the noun phrase. If unclear, ask for the title. |
| "add a chart from this CSV", "chart this data", "include this image", "add a section about X", "throw in a diagram for Y", "now add the principles", "include a glossary" | `add` | Default for any "add / include / now / throw in / append" verb against the current doc. |
| "change the chart to a line", "rephrase the intro", "make the footer say X", "move the footer above the chart", "tighten the principles section", "swap X for Y" | `edit` | Default for any "change / make / move / rephrase / swap / fix" verb against existing content. |
| "remove the third callout", "drop that section", "get rid of the footer", "delete the glossary" | `remove` | Identify the target by re-reading `index.html`; ask if ambiguous. |
| "open the doc", "show me what it looks like", "let me see", "open it" | `show` | `open <current-doc>/index.html`. |
| "rebuild from the log", "replay the events", "verify the log is correct" | `replay` | Diagnostic / integrity check. |
| "flatten this for sharing", "make it a single file", "freeze it", "make it portable" | `freeze` | Produces the single-file output. |
| "render this markdown as a doc", "turn this .md into a doc", `/doc render foo.md` | `render` (seed) | Convenience entry from existing markdown. |
| Explicit `/doc <verb> ...` | Whatever verb they typed | Always honored. Power-user escape hatch. |

### Implicit current-doc context

Across a session, the agent maintains the current doc context implicitly.
References like *"the doc"*, *"it"*, *"the chart"*, *"that section"* all
resolve against the most recently touched doc. The user does not have to
re-state which doc they mean. Read `<project-root>/.current-doc` to recover
the pointer at the start of a session if needed.

If the user has multiple in-flight docs and the reference is genuinely
ambiguous, ask one focused question (e.g. *"You have two docs in progress —
the Q1 perf report and the auth HLD. Adding this chart to the perf report?"*).
Do not ask the user to type `--to <slug>`.

### When intent is unclear

Ask one focused natural-language question. Examples:
- *"Got it — should I start a new doc for this, or add it to the perf report we're already building?"*
- *"Do you mean the architecture diagram in the intro, or the one in the appendix?"*

Do not require the user to type a verb. Do not return error messages
demanding slash command syntax. Always degrade to a single conversational
clarifying question.

### When to silently auto-invoke without asking

Most of the time. Specifically:
- Any phrasing that maps cleanly to one of the rows in the intent table
  above — just execute.
- First mention of an HTML doc, vision, HLD, LLD, learning note, or
  performance report when no doc exists yet — assume `new`.
- Follow-up content additions to a recently-created doc — assume `add`.

Only ask when the routing is genuinely ambiguous (multi-doc context, vague
target), not when the verb is obvious.

## Per-verb procedure

### `/doc new "<title>"`

1. Compute slug: `YYYY-MM-DD-<title-as-kebab>`. The date is *today*.
2. Compute output dir: `<project-root>/docs/<slug>/`. Create with `mkdir -p`.
   `<project-root>` is the git root if present, otherwise the directory the
   user is in.
3. Write a minimal `index.html` (just `<!doctype html>`, `<head>` with title
   + viewport + stylesheet link, `<body>` with an empty `<main>` and a
   `<script src="runtime.js">`). **No chassis yet** — that gets designed on
   first content add.
4. Write `style.css` with only the warm-notebook token block (color custom
   properties, type scale, spacing scale). No layout. Token inheritance only.
5. Write `runtime.js` with only the chrome primitives the doc might want
   (focus toggle, print, scroll-spy). No behavior primitives yet.
6. Write `doc-source.json` with `events: [{ "n": 1, "verb": "new", ... }]`.
7. Update `.current-doc`.
8. Tell the user the doc was created and what verbs come next. Do NOT
   declare the doc done — it has no content.

### `/doc add "<instruction>"`

1. Load current doc (or `--to` target). Read `index.html`, `style.css`,
   `runtime.js`, `doc-source.json`.
2. **Interpret the instruction.** What is the user adding? Examples:
   - *"section about X"* → prose section. Choose a structural shape (and if
     this is the first content add and the chassis hasn't been picked yet,
     **design the chassis now**).
   - *"this CSV → chart"* → asset + behavior. Copy data into `<doc>/data/`.
     Pick a chart shape (invent if needed). Wire the runtime primitive.
   - *"footer with X"* → modify the body close. May invent a footer chassis.
   - *"insert this image"* → asset + img element. Copy into `<doc>/assets/`.
   - *"glossary for these terms"* → behavior. Wire glossary popovers.
3. **Apply the four-pillars + originality contract per event.** If the event
   adds significant new content, it should invent at least one structural
   shape OR one behavior. Empty event-level invention is acceptable only for
   tiny additions (a phrase, a date tweak).
4. Modify whichever files need modifying: `index.html`, `style.css`,
   `runtime.js`, `data/*`, `assets/*`. The agent is responsible for keeping
   the folder internally consistent.
5. Append an event to `doc-source.json` (see [Event log schema](#event-log-schema)).
6. Re-run the doc-level pillar audit (against the full doc as it now exists)
   and update `pillar_audit` in the manifest.
7. Tell the user what changed in plain English. Offer `/doc show` if not
   already open.

### `/doc edit "<instruction>"`

Same as `add` but mutates an existing section/element rather than appending.
Identify the target by re-reading `index.html`; if ambiguous, ask which one.
Record as an `edit` event.

### `/doc remove "<target>"`

Identify the target (re-read `index.html`; ask if ambiguous). Remove it.
Clean up orphaned styles in `style.css` and orphaned primitives in
`runtime.js` that are no longer referenced. Remove orphaned assets from
`data/` and `assets/`. Record as a `remove` event.

### `/doc show`

```
open <current-doc>/index.html
```

### `/doc render <source.md>` (seed convenience)

1. Treat as `/doc new` with the source's H1 as the title.
2. Then internally process each `##` section in the source as a synthetic
   `/doc add` event, recorded in the event log as `verb: "add", origin: "seed:<source-path>"`.
3. The resulting doc behaves identically to one built conversationally — the
   event log just shows the seed events all at the same timestamp.

### `/doc replay [<slug>]`

Move the existing folder aside (`.bak`). Re-execute `events[]` from scratch
into a fresh folder. If the resulting folder matches the pre-replay state
(file content hashes equal across `index.html`, `style.css`, `runtime.js`,
and all `data/*` and `assets/*`), the log is lossless — delete `.bak`. If
not, surface the diff to the user and let them decide whether the divergence
is a manual edit (informational) or a recording bug (file an issue in the
manifest's `notes`).

### `/doc freeze [<slug>]`

Read all of `index.html`, `style.css`, `runtime.js`, and inline every asset
as base64 or data URLs where possible. Write to
`<doc-folder>/<slug>.frozen.html`. Source folder untouched.

## Event log schema

Every state-changing verb (`new`, `add`, `edit`, `remove`) appends to
`doc-source.json`'s `events[]` array. Schema:

```json
{
  "n": 5,
  "ts": "2026-05-14T17:45:00Z",
  "verb": "add",
  "instruction": "this csv → bar chart, sales by region",
  "origin": "user | seed:<path>",
  "files_touched": ["index.html", "style.css", "runtime.js", "data/sales.csv"],
  "assets_added": [{ "name": "data/sales.csv", "sha256": "..." }],
  "assets_removed": [],
  "structures_invented": [
    { "name": "...", "shape": "...", "purpose": "..." }
  ],
  "behaviors_invented": [
    { "name": "...", "purpose": "...", "appended_to": "runtime.js | style.css" }
  ],
  "structures_used": ["section", "chart-wrap"],
  "behaviors_used": ["renderBarChart"],
  "summary": "Added reactive bar chart bound to data/sales.csv. Edits to CSV update the chart on reload."
}
```

`n` is 1-indexed and strictly increasing. Never rewrite a past event; only
append. `summary` is one sentence the user could read in a history view.

## Folder layout (per doc)

```
docs/<slug>/
├── index.html        # the document
├── style.css         # tokens (inherited) + chassis (per-doc) + per-event extensions
├── runtime.js        # chrome + per-event behavior primitives
├── doc-source.json   # event log + doc-level audit
├── data/             # CSVs, JSON, any data the doc binds to
│   └── *.csv
└── assets/           # images, fonts, any other static assets
    └── *.png
```

`data/` and `assets/` are created lazily on first add that needs them.

Components and behaviors are **inlined per doc** in V0. There is no shared
`doc-kit/` package yet. Each doc carries a frozen copy of `style.css` and
`runtime.js` pinned at the *latest event's* render time (archive permanence
applies to the doc as it currently stands; replay produces the same state
deterministically from the log).

## Design what the doc/event needs (the heart of the skill)

Applies on every `add` and `edit`, and on the first content add inside a
`new` doc (when the chassis gets designed). Before reaching for any starter
pattern, ask:

- **What is the user adding right now, and how does it fit the doc so far?**
  Read the current `index.html` before designing. The new content has to
  make sense in the doc as it stands.
- **Is the chassis already decided?** If this is the first content add to a
  `new` doc, **design the chassis now**, informed by what's being added.
  A doc whose first add is a CSV + chart probably wants a dashboard chassis,
  not a prose-with-sections chassis.
- **What data does this event reference?** A CSV, a JSON, a table, numeric
  lists, frequency counts? *Parse it and render it inline. Copy the data
  into `<doc>/data/` so the binding is reactive — editing the data file
  updates the rendered output on reload.* Don't leave numbers in prose if a
  chart would tell the story better.
- **What structure does this event expose?** A system architecture? A
  decision tree? A timeline? A multi-axis comparison? A process flow? *Make
  the structure interactive — clicking should explain.*
- **What jargon does the doc use?** Domain-specific terms, project-specific
  names, references to other docs? *Wire a glossary if the doc has more
  than a handful.*
- **What recall does the doc reward?** Learning-shaped docs benefit from a
  quiz at the end.
- **What does this event need that the kit hasn't seen yet?** *Invent it
  inline.* Per-event invention is the default — every significant `add`
  should produce at least one structural shape OR behavior the kit hasn't
  seen. Record in the event's `structures_invented` or `behaviors_invented`.

The agent is the layout engine AND the behavior author AND the editor of an
existing artifact. Three jobs, every conversational turn.

## Starter visual vocabulary (snapshot, not menu)

These eleven patterns ship pre-styled in `style.css` (extracted from prior
renders). They are a **snapshot of what previous docs evolved**, not a catalog
to pick from. They handle the *aesthetic + warm* pillars for prose-heavy
sections cheaply when they happen to fit — but the default expectation is
that **this doc invents at least one structural shape the kit hasn't seen.**

If you find yourself reaching for the table below for every section, you are
templating. Stop and ask: what shape does *this content* want?

| name | shape | best for |
| --- | --- | --- |
| **`(invent)`** | **whatever this doc earns** | **always at least one new structural shape per doc** |
| `hero` | title + lede + thesis card with metadata | usually at the top, but a doc may want something else |
| `eyebrow` | small mono label | section pre-titles when extra context is wanted |
| `pullquote` | one big sentence with a clay left-border | thesis restatement, at most one per section |
| `note-grid` | 2-4 short comparison cards | "X keeps / Y adds / The bet" shapes |
| `principles` | numbered cards | named principles with prose underneath |
| `doc-types` | name + one-line + pill row | enumeration of things with a label each |
| `flow` | 3-6 step interactive workflow | linear processes worth click-to-expand |
| `callout` | clay (decisions) or sage (non-goals) | named decision records or out-of-scope |
| `decision-list` | details/summary | Q&A or expandable lists |
| `roadmap` | 3-column phase grid | V0/V1/V2 phasing or three-layer systems |
| `clean-list` | plain `<ul>` | flat bullets that need no decoration |

**Rule of thumb:** if every `components_used` entry in your manifest is from
this table, you templated. Re-render with a structural invention.

Examples of structural inventions a render might earn:
- A full-bleed data dashboard chassis (instead of the standard topbar + shell)
- A side-by-side compare layout for a doc that contrasts two systems
- A single-screen decision walk that occupies the viewport
- A timeline-as-spine layout where prose hangs off dated events
- An anatomy diagram: a real thing labelled with click-to-explain callouts
- A glossary-first chassis where definitions are the primary content and prose is secondary

## Computational behaviors (the heart of the kit)

These are not pre-styled templates. Each doc invents what it needs, drawing
from `runtime.js` primitives + per-doc inline code + per-doc CSS extensions.
**Every render should include at least one of these.** The starter vocabulary
above handles aesthetics; this list handles the *interactive + computational*
pillars.

| behavior | what it does | when to reach for it | runtime primitives |
| --- | --- | --- | --- |
| **`(invent)`** | **whatever this doc earns** | **always at least one new behavior per doc — top priority, not last resort** | **n/a — add a primitive to `runtime.js`** |
| `chart` | parse inline CSV/JSON, render bar/line/scatter as inline SVG | doc references numeric data or counts | `parseCsv`, `renderBarChart` |
| `arch-diagram` | clickable architecture diagram (SVG or HTML); clicking a node opens an explanation panel | doc has system structure to explain | `clickToExplain` |
| `decision-walk` | branching decision tree; user clicks through choices and the doc walks the path | doc walks a "should I do X" thinking process | `decisionWalk` |
| `timeline` | dated events on a horizontal axis, click to expand | doc has chronology worth exposing | `renderTimeline` |
| `comparison` | multi-axis side-by-side with swappable items | doc compares options/tools/approaches | `comparator` |
| `glossary` | underline defined terms inline; click/focus reveals definition popover | doc has jargon the reader should look up | `glossary` (auto-wires from `<script id="glossary">`) |
| `quiz` | recall prompts that reveal on click | learning notes | `quiz` |
| `drawer` | progressive disclosure for optional depth (side panel slides) | doc has appendix-shaped depth | `drawer` (or use `<details>` for inline) |
| `code-runnable` | inline JS that runs in the page (where safe) | doc explains an algorithm or shows live output | `runner` |

When a doc needs a primitive not yet in `runtime.js`, **add the primitive in
this render** and pin the resulting `runtime.js` into the doc folder. That's
archive permanence at work — the primitive lives with the doc that needed it.

## Authoring contracts (apply on every state-changing verb)

These contracts govern how `style.css`, `runtime.js`, `index.html`, and
`doc-source.json` are touched on every `new`, `add`, `edit`, `remove`, or
`render`. They apply per-event in the conversational model.

### `style.css` contract

**Read the current `style.css` before modifying. Modify in place; do not
rewrite from scratch on every event.** Layer the changes:

- **Tokens** (CSS custom properties: color, type scale, spacing scale) are
  set once at `new` time from the warm-notebook baseline. Subsequent events
  add layout/component styles, not new tokens (unless the doc earns one).
- **Chassis** styles are set on the first content add (when the chassis gets
  designed) or on a chassis-changing `edit`. Subsequent events extend.
- **Per-event extensions** (chart wrappers, glossary terms, decision-walk
  buttons, footer styling, image frames, etc.) are appended at the bottom
  with a comment marker: `/* event #N — <verb> "<short instruction>" */`.

**Read prior renders' `style.css` for vocabulary and palette — do not paste
whole stylesheets forward.** Reference, don't copy.

Carry forward at `new` time: tokens, body font stack, base prose rhythm.
Author fresh: layout primitives, section chassis, behavior-specific styles.

The inkling repo's `docs/examples/vision/style.css` and
`docs/examples/doc-explained/style.css` are **references for what tokens and
rhythms look like — not starting files to copy.** Prior renders in the user's
own project (their `docs/*/style.css`) serve the same role.

### `runtime.js` contract

**Read the current `runtime.js` before modifying. Modify in place.** Layer
the changes:

- **Chrome primitives** (focus toggle, print, scroll-spy, contenteditable
  bookkeeping) are set at `new` time. Almost never change.
- **Behavior primitives** are added as events earn them. Each primitive is
  appended at the bottom with a comment marker: `/* event #N — <primitive
  name> */`.
- **Per-event init blocks** (auto-wiring for `[data-chart]` elements,
  `<script id="glossary">` JSON tags, etc.) are appended at the bottom
  inside a single growing init function or appended on DOMContentLoaded.

Read prior renders' `runtime.js` for **library reference** — primitives the
kit has already invented are candidates to reuse. Carry forward by *copy of
the function* only when this doc uses it.

Every significant `add` event should produce at least one new primitive OR
one new structural shape. Empty event-level invention is acceptable only for
trivial events (phrase tweak, date change).

### `index.html` contract

**There is no canonical chassis.** On the first content add to a `new` doc,
**design the chassis from the content's needs.** Candidates:

- A full-bleed data dashboard (no shell, no nav, chart-first viewport)
- A side-by-side compare layout for contrast-shaped content
- A single-screen decision walk that occupies the viewport
- A timeline-as-spine where prose hangs off dated events
- A glossary-first chassis where definitions are primary content
- An anatomy diagram chassis where a labelled thing IS the doc
- A prose-with-sections chassis (see [HTML skeleton](#html-skeleton)) — use
  only when the content is genuinely prose-shaped

Record the chassis choice in `doc-source.json` (`chassis` field at the doc
level).

Subsequent `add` and `edit` events extend the chassis: append sections,
insert into existing sections, swap content. Avoid restructuring the chassis
mid-doc unless the user asks for it.

**No inline `style=""` attributes** in any chassis. All styling lives in
`style.css`.

### `doc-source.json` contract (full schema)

```json
{
  "version": "v0.2",
  "renderer": "doc-skill@v0.2",
  "slug": "YYYY-MM-DD-<kebab>",
  "title": "doc title",
  "created_at": "ISO-8601 UTC",
  "last_event_at": "ISO-8601 UTC",
  "output_dir": "absolute path to this folder",
  "theme": "warm-notebook@v0",
  "doc_type_hint": "vision | HLD | LLD | learning | note | report | none",
  "chassis": "<name of the chassis chosen on first content add>",
  "seed": { "type": "markdown | none", "path": "...", "sha256": "..." },

  "events": [
    {
      "n": 1,
      "ts": "ISO-8601 UTC",
      "verb": "new | add | edit | remove | render",
      "instruction": "verbatim user instruction",
      "origin": "user | seed:<path>",
      "files_touched": ["index.html", "style.css", "runtime.js", "data/sales.csv"],
      "assets_added": [{ "name": "data/sales.csv", "sha256": "..." }],
      "assets_removed": [],
      "structures_used": ["section", "chart-wrap"],
      "structures_invented": [
        { "name": "...", "shape": "...", "purpose": "..." }
      ],
      "behaviors_used": ["renderBarChart"],
      "behaviors_invented": [
        { "name": "...", "purpose": "...", "appended_to": "runtime.js | style.css" }
      ],
      "event_audit": {
        "originality": "0-10 + one-line evidence"
      },
      "summary": "one-sentence reader-facing description"
    }
  ],

  "doc_audit": {
    "interactive": "0-10 score + one-line evidence",
    "computational": "0-10 score + one-line evidence",
    "aesthetic": "0-10 score + one-line evidence",
    "warm": "0-10 score + one-line evidence",
    "originality": "0-10 score + one-line evidence"
  },

  "notes": "free-text: judgment calls worth remembering on replay or revise"
}
```

**Contracts:**

- `events` is append-only and strictly increasing on `n`.
- A `new` event has empty `structures_used` / `behaviors_used` (no content
  yet) but populates `seed` if the doc was seeded from markdown.
- For any `add` or `edit` that introduces non-trivial content:
  `structures_invented` OR `behaviors_invented` MUST be non-empty.
  Empty both = templated event = redo.
- `doc_audit` is recomputed after every event. Originality below 5 at the
  doc level is a hard fail — surface to the user, propose a fix.
- `event_audit.originality` records the per-event score so the history shows
  where templating happened.

Compute file hashes with `shasum -a 256 <file> | cut -d' ' -f1`. Compute
timestamps with `date -u +%Y-%m-%dT%H:%M:%SZ`.

### Self-audit (run after every state-changing event)

Read the doc as it now exists. Score each axis honestly 0-10:

- **Interactive**: how many user actions does the doc reward?
- **Computational**: does the doc parse, compute, render data? Or static prose only?
- **Aesthetic**: typography hierarchy, layout discipline, restraint?
- **Warm**: paper tones, serif display, invites a reopen?
- **Originality**: did this event/doc *design what was needed* or *pick from
  what existed*? Specifically: are `structures_invented` and
  `behaviors_invented` non-empty across the event log? Or did every entry
  come from the starter table?

Write to `doc_audit` in the manifest. If any axis is below 6 at the doc
level, **fix it before declaring the event done.** **Originality below 5
is a hard fail.**

Then tell the user what changed and offer `open <output-dir>/index.html`.

## HTML skeleton

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="{{first-paragraph-or-thesis}}" />
    <title>{{title}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,450..750,60&family=Source+Serif+4:opsz,wght@8..60,400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="progress" aria-hidden="true"></div>
    <header class="topbar">
      <div class="shell topbar-inner">
        <a class="brand" href="#top" aria-label="Back to top">
          <span class="mark">{{two-letter-mark}}</span>
          <span>
            <strong>{{short-title}}</strong>
            <span>{{doc-type-hint}}</span>
          </span>
        </a>
        <nav class="nav" aria-label="Document sections">
          {{ one <a href="#slug"> per ## }}
        </nav>
        <div class="actions">
          <button class="ghost-button" type="button" id="focusToggle" aria-pressed="false">Focus mode</button>
          <button class="ghost-button" type="button" id="printButton">Print</button>
        </div>
      </div>
    </header>

    <main id="top" class="shell">
      <section class="hero" aria-labelledby="title"> ... </section>
      {{ one <section class="section"> per ## }}
    </main>

    <footer class="footer"> <div class="shell">{{footer-line}}</div> </footer>

    {{ optional JSON tags: flow-details, glossary, chart-* }}
    <script src="runtime.js"></script>
  </body>
</html>
```

## Rules

- **Natural language is the only user interface. Never require slash commands.**
  The user opens Claude Code and types in plain English: *"create an HTML
  doc for Q1 perf"*, *"add a chart from this CSV"*, *"change the footer to
  say X"*. The agent recognizes the intent and silently routes to the right
  internal verb. The verbs (`new`, `add`, `edit`, `remove`, `show`, `render`,
  `replay`, `freeze`) are this skill's *internal mechanics*, not the user's
  syntax. Explicit `/doc <verb>` invocations are honored as a power-user
  escape hatch, but never demanded.
- **Auto-invoke on intent match, do not wait for `/doc`.** When the user
  describes wanting to create, extend, edit, view, or reshape an
  HTML/interactive document — by any phrasing — invoke this skill silently.
  See the intent recognition table earlier in this file.
- **Maintain implicit current-doc context across the session.** References
  like *"the doc"*, *"it"*, *"the chart"*, *"that section"* resolve to the
  most recently touched doc folder. Read `<project-root>/.current-doc` if
  the pointer needs recovery. Never make the user type `--to <slug>`.
- **Ambiguity is resolved with one focused natural-language question, not
  syntax demands.** Example: *"Adding this to the perf report or starting a
  new doc?"* — not *"please specify --to <slug>"*. Never return an error
  telling the user to use the right verb.
- **The doc folder is the source of truth.** Edits flow through the agent
  into the live folder on every turn. There is no canonical markdown source.
  Markdown-as-seed (`render`) is a convenience entry, not the primary path.
- **Read before you write, every turn.** On every `add` / `edit` / `remove`
  the agent reads the current `index.html`, `style.css`, `runtime.js`, and
  `doc-source.json` first. The agent is editing an existing artifact, not
  generating one from scratch.
- **Design what the event needs. Do not pick from a menu.** Starter
  vocabulary and behavior tables are *snapshots of what previous docs
  evolved*, not catalogs. If every change you make comes from a table in
  this file, you templated.
- **Hit all five axes, post-event.** Interactive + Computational + Aesthetic
  + Warm + Originality. If any axis scores below 6 at the doc level after
  the event, fix it before declaring done. Originality below 5 is a hard fail.
- **Invent per event when content earns it.** Non-trivial `add` and `edit`
  events must populate `structures_invented` OR `behaviors_invented` in the
  event entry. Empty both = templated event = redo.
- **Append-only event log.** `doc-source.json`'s `events[]` is append-only.
  Never rewrite past events. Each event is replayable on its own.
- **Read prior docs' runtime/style for vocabulary, not as starting files.**
  Inherit tokens. Author layout fresh per doc; extend per event within a doc.
- **Data and assets live inside the doc folder.** Copy CSVs into
  `<doc>/data/`. Copy images into `<doc>/assets/`. The doc folder is
  portable as a unit. Charts bind to local data so the binding is reactive.
- **No inline `style=""` attributes.** All styling lives in `style.css`.
- **One stylesheet, one runtime, one HTML per doc.** No bundlers, no build
  step. The folder must open from `file://`.
- **Archive permanence.** Each doc folder is self-contained at the *current
  state*. The pinned `style.css` and `runtime.js` reflect the latest event.
  Replay is deterministic; updates to the kit do not retroactively change a
  doc unless the user explicitly replays it.
- **`contenteditable="true"`** on title, lede, thesis, pullquote. Other text
  is static.
- **Record everything per event.** Files touched, assets added/removed,
  structures and behaviors used and invented, event audit, one-sentence
  summary. Future-you reads the event log to understand the doc's history.
- **Brand mark stays consistent across docs in the same kit.** Cohesion is
  at the *token* level, not the *chassis* level.

## Reference renders in the inkling repo

The [inkling repo](https://github.com/MeetVys/inkling) ships three reference
renders. Read at least one before authoring a new doc — for **vocabulary**,
not as starting files to copy.

1. **`docs/`** (live tutorial, served at
   [meetvys.github.io/inkling](https://meetvys.github.io/inkling/)) — a
   conversation-spine chassis. The doc body is laid out as a simulated
   chat between user and agent, because the tutorial about a conversational
   tool *is* a conversation. Demonstrates structural invention at the
   chassis level plus four new behavioral primitives (`flowStepper`,
   `folderAnatomy`, `toggleCompare`, `eventLogReveal`).

2. **`docs/examples/vision/`** — a prose-with-sections chassis. Uses the
   starter visual vocabulary heavily. Useful reference for the warm-notebook
   tokens and section rhythm. Honest originality score: low — every
   structural component came from the starter vocabulary. Kept in the repo
   as a clear "what the templater-drift failure mode looks like."

3. **`docs/examples/doc-explained/`** — a learning chassis with computational
   behaviors. Behaviors invented at the runtime layer (`parseCsv`,
   `renderBarChart`, `clickToExplain`, `glossary`). Useful reference for
   inline charts, glossary popovers, and click-to-explain wiring. Originality
   medium — structural shapes were still from the starter vocabulary; the
   chassis itself was not invented.

The contrast between these three is intentional. Render #1 is what the
contract demands. Renders #2 and #3 are honest about where the kit was
before the contract was hardened. Read all three to understand the gap
between templating and intelligence-led design.

## Backward compatibility (v0 → v0.2 manifests)

If you encounter a `doc-source.json` written under the old v0 schema (no
`events[]` array, no `structures_invented`, no `behaviors_invented`), migrate
on next operation against the doc:

1. Read the old manifest.
2. Synthesize a single `render` event from the original seed (use `seed.path`
   + `seed.sha256` from the old manifest if present, otherwise reconstruct
   from the source markdown's current sha256).
3. Backfill `structures_used` from the old `components_used` field.
4. Set `behaviors_invented` and `structures_invented` based on the actual
   contents of `runtime.js` and `style.css` if you can infer them; otherwise
   leave empty with a note in the event entry.
5. Run a fresh `doc_audit` against the current state of the doc.
6. Append the synthetic event as `n: 1`; subsequent operations append as
   normal.

## V1 graduation

V1 extracts recurring structures and behaviors into a shared `doc-kit/`
package so renders compound across docs. Trigger: 3+ docs rendered AND at
least one *invented* structure or behavior reappears in 2+ docs. Reuse is
observed, not prescribed.
