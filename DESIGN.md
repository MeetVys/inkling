# `inkling` — design philosophy

This document captures *why* `inkling` is shaped the way it is, what contracts it enforces, and what an adopter or contributor needs to understand before extending it. For the user-facing pitch, see [`README.md`](README.md). For the operational spec, see [`skill/SKILL.md`](skill/SKILL.md).

## The premise

Markdown was the right output format when agents could only write text. Now agents can render anything. So why is the output still plain text?

`inkling` is built around one bet: **HTML is the agent's native artifact format.** A thinking document — a vision, an HLD, an LLD, a learning note, a perf report — should be as expressive as the agent that wrote it. That means:

- Parse a CSV and render a live chart, not paste numbers as prose
- Show an architecture as a clickable diagram, not as ASCII art
- Walk a decision tree, not flatten it into bullets
- Highlight jargon dynamically, not link out to a separate glossary file
- Survive the AI: every artifact runs without a server, today and in a decade

## The contracts

These are the load-bearing rules. Break them and the project loses its character.

### 1. Natural language is the only user interface

The user opens Claude Code and types plain English: *"create an HTML doc for X"*, *"add a chart from this CSV"*, *"remove that callout"*. The agent recognizes the intent and silently routes to the right internal mechanism.

The user never has to type slash commands as a normal workflow. The internal verbs (`new`, `add`, `edit`, `remove`, `show`, `render`, `replay`, `freeze`) are this skill's *internal mechanics*, not the user's syntax. Explicit `/inkling <verb>` invocations remain available as a power-user escape hatch, but they are never demanded.

### 2. The doc folder is the source of truth

There is no canonical markdown source. The HTML doc folder — `index.html`, `style.css`, `runtime.js`, `doc-source.json`, `data/*`, `assets/*` — *is* the document. Edits flow through the agent into the live folder on every turn.

Markdown-as-seed (`render <source.md>`) is a convenience entry point for cases where draft prose already exists. It is not the canonical path.

### 3. Design what the doc needs — do not pick from a menu

The agent does not pattern-match a markdown source onto a predetermined HTML template. Every render is expected to design what *this specific doc* needs from first principles.

Reuse exists, but it is **observed** (a shape that worked last time may fit again) — not **prescribed** (here is the catalog, pick from it).

Enforcement is contractual:
- `structures_invented` field in every event entry must be non-empty when content earns it
- `behaviors_invented` field must be non-empty when the source references data, structure, decisions, jargon, or chronology
- `originality` is one of five audit axes; below 5/10 is a hard fail

### 4. All five axes, every render

| Axis | What it measures |
|---|---|
| **Interactive** | How many actions does the doc reward? Real interactions, not just chrome (focus toggle, print). |
| **Computational** | Does the doc parse, compute, render data? Or is it static prose dressed in nice CSS? |
| **Aesthetic** | Typography hierarchy, layout discipline, restraint. |
| **Warm** | Paper tones, serif display, gentle interactions. Invites a reopen. |
| **Originality** | Did this render design what this doc needed, or pick from what existed? |

Below 6/10 on any axis = fix before declaring done. Below 5/10 on originality = hard fail, redo with real per-doc structural design.

### 5. Archive permanence

Rendered artifacts are frozen at render time. Each `docs/<slug>/` folder carries a pinned copy of the `runtime.js` and `style.css` it was rendered with. Updates to the kit are **forward-only** — they apply to new renders, never retroactively to existing docs.

A 2026 doc reads the same in 2030. `replay` rebuilds deterministically from the event log to verify the log is lossless.

## The shape of a doc

```
docs/<slug>/
├── index.html        # the document
├── style.css         # tokens (inherited) + chassis (per-doc) + per-event extensions
├── runtime.js        # chrome primitives + per-event behavior primitives
├── doc-source.json   # event log + doc-level audit
├── data/             # CSVs, JSON, anything the doc binds to
└── assets/           # images, fonts, any other static assets
```

Each piece carries a specific responsibility:

- **`index.html`** — the markup. Each `<section>` is a structural shape the agent picked or invented. Survives without a server; opens from `file://`.
- **`style.css`** — inherits warm-notebook tokens (color, type, spacing) so every doc in the kit looks like part of the same library. Layout is authored fresh per doc; chassis is decided lazily on first content add. Per-event extensions are appended with comment markers.
- **`runtime.js`** — chrome primitives (progress bar, focus toggle, print) plus any computational behaviors the doc earned. Per-event invented primitives are appended with comment markers.
- **`doc-source.json`** — the append-only event log. Every state-changing turn appends one entry. This is the lossless history of the doc.

## The event log schema (v0.2)

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

**Append-only.** Never rewrite past events. `replay` rebuilds the folder from `events[]` and compares to the current state — divergence flags either a manual file edit (informational) or a recording bug (must-fix).

## The verb map

What the agent thinks about. What the user never has to type.

| Verb | Triggered by user saying (examples) |
|---|---|
| `new` | "create an HTML doc for X", "make me a doc about X", "let's start a vision doc" |
| `add` | "add a chart from this CSV", "include this image", "add a section about X" |
| `edit` | "change the chart to a line", "rephrase the intro", "move the footer above the chart" |
| `remove` | "remove the third callout", "drop that section", "delete the glossary" |
| `show` | "open the doc", "show me what it looks like", "let me see" |
| `render` | "render this markdown as a doc" (convenience seed from an existing `.md`) |
| `replay` | "rebuild from the log", "verify the log is correct" |
| `freeze` | "flatten this for sharing", "make it a single file", "freeze it" |

The full intent-recognition table lives in [`skill/SKILL.md`](skill/SKILL.md).

## Implicit current-doc context

Across a session, the agent maintains the current doc context implicitly. References like *"the doc"*, *"it"*, *"the chart"*, *"that section"* resolve against the most recently touched doc folder. The pointer lives at `<project-root>/.current-doc`.

If multiple docs are in flight and the reference is genuinely ambiguous, the agent asks one focused natural-language question — never a syntax demand.

## Reactive data binding

When data is added and a chart is bound to it, editing the data file updates the chart on reload. The agent is responsible for wiring this correctly.

Static numeric prose is a templater move. Bound charts are the kit's signature.

## What's not yet built (V1, V2)

**V1 — the kit compounds.** Extract recurring structures and behaviors observed across docs into a shared `doc-kit/` package. Reuse becomes faster and more consistent. Graduation trigger: 3+ docs rendered AND at least one inlined structure or behavior reappears in 2+ docs.

**V2 — the kit evolves.** Add `taste.json` (a learned profile of the user's stylistic preferences) and cross-doc memory loaded on every render. Optional research stretch: two-way revise via marker comments that round-trip HTML edits to source.

`inkling` ships V0 today: the renderer agent, the conversational verbs, the event log, the five-axis contract. V1 and V2 are earned by dogfood evidence, not built speculatively.

## Why this isn't a static site generator

Static site generators take a markdown source and produce HTML. They are one-shot, source-driven, template-locked. `inkling` is conversational, folder-driven, and template-free.

Three things distinguish it:

1. **No source file.** The doc folder is the artifact and the source. There is no separate `.md` to edit.
2. **Per-doc design.** No templates. Every render designs the chassis it needs.
3. **Append-only history.** Every turn is recorded as an event. The doc has a lossless history; you can replay or audit it.

## Why this isn't Observable, Idyll, or Distill

- **Observable** lives on a server. `inkling` artifacts run from `file://`.
- **Idyll** requires authoring a separate markup language. `inkling` requires no markup.
- **Distill** is a publishing platform. `inkling` is a personal doc builder; sharing is opt-in via `freeze`.

The three constraints combined — single-or-modular self-contained folder + agent-rendered from intent + persistent personal archive — were not occupied before `inkling`.

## License

MIT. See [`LICENSE`](LICENSE).
