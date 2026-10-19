# Using PMM OS — what you actually press

Written by running the product end to end on 2026-07-30, from a clean HOME, on the
published `pmm-os@3.0.3`. Every step below is what happened, not what should happen.

---

## 1. Install — one command, then one restart

**You type:**

```bash
npx pmm-os install
```

**You see** (about 20 seconds):

```
PMM OS — installing

  ✓ payload → ~/.pmm-os/plugin
  ✓ marketplace registered (pmm-os)
  ✓ plugin installed (pmm-os@pmm-os)

Done. Restart Claude Code (or run /reload-plugins).
```

**You press:** `/reload-plugins` — or restart. Nothing works until you do.

Requires Claude Code **2.1.143+**. The installer shells out to the `claude` CLI; if it
isn't on your PATH it stages the payload and prints the two manual commands instead.

**Doing it by hand instead** — note it is *two* steps; the first only registers the catalog:

```
/plugin marketplace add buildingwithai/pmm-os
/plugin install pmm-os@pmm-os
```

**Codex:**

```bash
codex plugin marketplace add buildingwithai/pmm-os
codex plugin add pmm-os@pmm-os
```

On Codex there's an extra gate: plugin hooks stay inactive until you review and trust
them. Codex prompts you. Until you accept, the routing and quality-gate hooks do nothing.

---

## 2. There is no form. You type a sentence.

This is the part that surprises people. PMM OS has **no wizard, no setup screen, and no
fields to fill in**. You open Claude Code in a project folder and type a sentence:

```
take Plotline to market
```

Skills are model-invoked, so the right one is chosen from your phrasing. You *can* call
them explicitly — they're namespaced:

```
/pmm-os:product-marketing-os
/pmm-os:pmm-positioning-exercise
/pmm-os:pmm-launch-kit
```

but you don't have to, and mostly shouldn't.

### What it asks you for

Not a form — questions, and only for what it can't find. Before asking anything it reads:

1. **Your code**, if the product has a repo. This is Stage 0 grounding, and it runs first
   by design: capability claims get a `path:line`, and "intent" gets separated from
   "implemented." A README that oversells is caught here.
2. `.agents/product-marketing.md` — the context spine, if a previous run made one.
3. `.agents/research/evidence.md` — the evidence ledger.

Then it asks 2–3 sharp questions about what's genuinely missing, or states labelled
assumptions and proceeds. The one thing it always wants and can rarely infer:

> **Who is this for, and what do they use today instead?**

Everything else it will attempt from your repo and its research.

### The one field that matters: category

The context template has a **Positioning → market category** field, and it's the highest-
leverage thing you'll type. It sets the frame of reference for every downstream artifact:
who you're compared against, what your price looks like, which objections you inherit.
Get it wrong and 46 skills produce coherent, well-evidenced, wrongly-aimed work.

If you don't know it, say so — `pmm-positioning-exercise` derives it from competitive
alternatives rather than making you guess.

---

## 3. What runs, and roughly how long

A full engagement, in the order the orchestrator sequences it:

| Stage | What happens | Rough time |
|---|---|---|
| Grounding | Reads the repo, writes `.agents/research/product-grounding.md` | 2–5 min |
| Research desks | Up to ten desks fan out across the two engines, ~15–30 scoped calls each | 20–40 min |
| Evidence ledger | Findings distilled into `.agents/research/evidence.md`, each with a source | rolled in |
| Positioning | Dunford exercise against the alternatives found | 5–10 min |
| Messaging, competitive, pricing, GTM | Each grounded in the ledger | 15–30 min |
| Coach review | Adversarial pass; scores against an 11-row rubric | 5 min |
| Launch kit | One `kit-content.json` → one HTML app + markdown mirrors + a Marp deck | under 1 min |

You are not idle during this — it narrates and asks when it's genuinely stuck.

**Research setup, honestly:** `last30days` (Reddit, Hacker News, Polymarket, GitHub) works
with no configuration. The wider sweep — video transcripts, arbitrary URLs, more platforms
— needs a one-time opt-in:

```bash
npx pmm-os setup --yes
```

It installs Python packages and a headless browser, and tells you so before it does.
`last30days` wants Python 3.12+; it falls back to fetching one via `uv` if your system
Python is older, which stock macOS (3.9) will be.

---

## 4. What you get, and how you use it

The run ends in **one self-contained HTML file**. No server, no build, no dependencies —
double-click it.

```
your-launch/
├── kit-content.json              ← the single source of truth
├── <wordmark>-launch-kit.html    ← the app
├── generated-docs/*.md           ← markdown mirrors of every section
└── deck.md                       ← Marp slide deck → pptx/pdf
```

Inside the kit:

| You press | You get |
|---|---|
| **⌘K** | Command palette — jump to any section, persona, pillar or battlecard |
| Click a row | The right-hand **inspector** fills with that item's detail — a persona's JTBD, pain, channel, and a copyable verbatim |
| **Present** | Chrome disappears, deck mode, arrow keys, slide counter |
| **Notes** | A notebook panel with `/` slash-insert |
| **Edit** | Inline rich-text editing that writes back to `kit-content.json` |
| **PDF** | Print stylesheet that drops the chrome |

To edit with live reload, run it as a server from your launch folder:

```bash
node ~/.pmm-os/plugin/skills/pmm-launch-kit/scripts/kit-server.mjs .
```

Save in the page → `kit-content.json` updates → rebuild → the tab reloads over SSE.

To rebuild by hand after editing the JSON:

```bash
node ~/.pmm-os/plugin/skills/pmm-launch-kit/scripts/build-kit.mjs <your-launch-folder>
```

---

## 5. What surprised me running it

- **The hooks are silent and fail open.** All six end in `|| exit 0`. You will not notice
  them; that's deliberate, and it's the fix for the version that bricked Claude Code.
- **The research gate advises, it doesn't block.** Produce a GTM plan with an empty ledger
  and you get a note saying it isn't grounded — not a refusal.
- **The coach genuinely disagrees.** In the self-run it read the source and overturned a
  factual claim the rest of the chain had inherited. That's the most valuable thing in the
  product and it is invisible until you get there.
- **Skill choice is the real failure mode.** With 46 skills, the opening sentence decides a
  lot. If the run goes somewhere odd, name the skill explicitly and rerun.

## 6. Uninstalling

```bash
npx pmm-os uninstall
```

Removes the plugin, the marketplace entry, the payload, and any PMM OS token in the
research engine's config. It prints what it deliberately leaves behind — the setup marker,
the engine config, and any Python packages, since other tools may use them.
