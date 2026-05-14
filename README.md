# inkling

**Talk to your docs. They will build themselves.**

`inkling` is a conversational HTML doc builder for [Claude Code](https://claude.com/claude-code). Open Claude Code, say *"create an HTML doc for X"* in plain English, and the agent designs and edits a real folder of HTML, CSS, JavaScript, and data on your disk — turn by turn, as you think out loud.

No slash commands. No markup. No templates. Every doc is **interactive, computational, aesthetic, and warm.**

→ **[See it in action: live tutorial](https://meetvys.github.io/inkling/)**

---

## What it is

`inkling` is a [Claude Code skill](https://docs.claude.com/claude-code/skills). When installed, Claude Code automatically recognizes when you're trying to build a thinking-shaped document — a vision doc, an HLD, an LLD, a learning note, a performance report — and routes silently to this skill.

You write intent in plain English. The agent:

1. **Designs** the right chassis for *this specific doc* — not a template
2. **Invents** structural shapes and behavioral primitives the doc earns
3. **Edits** the live doc folder (`index.html`, `style.css`, `runtime.js`, `data/*`, `assets/*`) on every turn
4. **Records** every change in an append-only event log
5. **Audits** the doc on five axes: Interactive, Computational, Aesthetic, Warm, Originality

The doc folder is the source of truth — not a markdown file. Each artifact survives without a server, opens in any browser, and stays archive-worthy.

## The principles

1. **Natural language is the only user interface.** Slash commands exist as power-user escape hatches, never required syntax.
2. **The doc folder is the source of truth.** No external markdown source. The agent edits the live folder on every turn.
3. **Design what each doc needs.** Do not pick from a menu. Every render must invent at least one structural shape and one behavior when content earns it.
4. **All five axes, every render.** Interactive + Computational + Aesthetic + Warm + Originality. Originality below 5/10 is a hard fail.
5. **Archive permanence.** Rendered artifacts are frozen at render time. Updates to the kit are forward-only; old docs stay exactly as written.

See [`DESIGN.md`](DESIGN.md) for the full design philosophy and contracts.

## Install

You'll need [Claude Code](https://claude.com/claude-code) installed first.

**One-liner:**

```bash
curl -fsSL https://raw.githubusercontent.com/MeetVys/inkling/main/install.sh | bash
```

**Or manually:**

```bash
git clone https://github.com/MeetVys/inkling.git
mkdir -p ~/.claude/skills/doc
cp inkling/skill/SKILL.md ~/.claude/skills/doc/SKILL.md
```

That's it. The skill auto-loads on next Claude Code session.

## Quickstart

Open Claude Code in any folder. Type:

> Hey, create an HTML doc that captures my notes on the Q1 onboarding revamp. Use a flowchart for the funnel and a chart for the drop-off CSV I'm about to paste.

The agent will create `docs/<slug>/` with `index.html` + `style.css` + `runtime.js` + `doc-source.json`, and tell you in plain English what it did.

Then keep talking:

> Here's the data:
>
> ```
> step,users
> Landing,4200
> Signup,2100
> Verify,900
> Activate,540
> ```
>
> Chart this as a funnel.

The agent copies your CSV into `<doc>/data/`, designs a chart chassis if the doc didn't have one, invents a new chart primitive if the kit hasn't seen this shape, and reports back.

Keep going. *"Add a section about what we changed."* *"Move the chart above the principles."* *"Open it."* *"Remove the third callout."* No slash commands. The agent maintains current-doc context across the session — references like *"the doc"*, *"it"*, *"the chart"* resolve automatically.

## Examples (live, hosted on Pages)

- 📖 **[Live tutorial](https://meetvys.github.io/inkling/)** — the interactive walkthrough that brought you here
- 🌱 **[Vision doc example](https://meetvys.github.io/inkling/examples/vision/)** — a project's vision rendered as an `inkling` artifact
- 🛠 **[/doc explainer](https://meetvys.github.io/inkling/examples/doc-explained/)** — the skill explained as one of its own outputs

## How it works under the hood

When you express intent in plain English, the agent silently routes to one of these internal verbs:

| Verb | What it does |
|---|---|
| `new` | Creates an empty doc folder. Chassis decided lazily on first content add. |
| `add` | Appends content. CSVs are copied into `data/`, images into `assets/`, structures and behaviors are invented per-event. |
| `edit` | Modifies existing content. |
| `remove` | Drops a section or element. |
| `show` | Opens the doc in your default browser. |
| `render <source.md>` | Convenience seed: starts a new doc from an existing markdown file. |
| `replay` | Rebuilds the doc folder deterministically from the event log. |
| `freeze` | Flattens the doc folder into a single shareable `.html`. |

You never type these directly. They describe what the agent does, not what you say.

Each invocation appends an event to `doc-source.json`:

```json
{
  "n": 3,
  "ts": "2026-05-14T18:42:11Z",
  "verb": "add",
  "instruction": "chart the funnel CSV as a bar chart",
  "files_touched": ["index.html", "style.css", "runtime.js", "data/funnel.csv"],
  "structures_invented": [{ "name": "...", "shape": "...", "purpose": "..." }],
  "behaviors_invented": [{ "name": "renderFunnelChart", "purpose": "...", "appended_to": "runtime.js" }],
  "event_audit": { "originality": "8/10 — invented chart chassis specific to funnel shape" },
  "summary": "Added reactive bar chart bound to data/funnel.csv. Edits to the CSV update the chart on reload."
}
```

The log is append-only. `replay` rebuilds the folder from the log to verify it's lossless.

## Project status

`inkling` is at **V0** — the renderer agent works, manifest schema is at v0.2 with full conversational event log, structural and behavioral invention is contractually enforced.

V1 (in development): extract recurring structures and behaviors into a shared `doc-kit/` package, so renders compound across docs.

V2 (research): `taste.json` + cross-doc memory loaded per render; two-way revise via marker comments.

## Contributing

Issues and discussions welcome. This started as one person's tool for their own thinking docs — if it resonates with you, send patterns the agent should learn, examples of docs that broke the originality audit, or new computational behaviors the kit should grow.

## License

MIT — see [`LICENSE`](LICENSE).

## Credits

Built with [Claude Code](https://claude.com/claude-code) and [gstack](https://github.com/garrytan/gstack). The design philosophy was shaped through a [`/office-hours`](https://github.com/garrytan/gstack) session that pressure-tested premises and forced the right reframes.
