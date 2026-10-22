<div align="center">

# PMM OS — Product Marketing Operating System

**Turn a product brief into positioning, messaging, personas, pricing, competitive intel, and a full launch plan — then package the whole thing into a shippable, interactive launch kit. Without leaving your terminal.**

A Claude Code / Codex plugin: **46 product-marketing, GTM & PLG skills**, **two built-in research engines**, a deep framework library, and a zero-dependency generator that turns strategy into an app.

![PMM OS launch kit — a click-through of the workspace views](docs/images/launch-kit-demo.gif)

</div>

---

## Why it exists

Most "marketing AI" gives you a wall of generic advice. PMM OS gives you **decisions and artifacts**: it grounds every output in your product context, applies real frameworks (April Dunford positioning, JTBD personas, value-metric pricing, win/loss CI), holds a strict depth bar so nothing comes back as a one-line stub, and ends a launch with something you can actually hand to a team.

It behaves like **one product**, not 46 band-aided prompts: shared context, one depth standard, one framework library, and a chain that always flows to a finished deliverable.

## The launch kit — what you actually ship

Every launch ends with a single **self-contained, offline HTML app** (no dependencies, no build step to view it): a left sidebar, a main workspace, and a right inspector — plus a ⌘K command palette, present/deck mode, status tracking, and a one-click live editor (rich text, slash-insert, drag-reorder, highlight→comment) that writes changes back to source.

<div align="center">

**⌘K command palette — jump to any section, persona, pillar, or battlecard**

![Command palette](docs/images/command-palette.png)

</div>

| Positioning | Competitive | Pricing |
|:--:|:--:|:--:|
| ![Positioning](docs/images/positioning.png) | ![Competitive](docs/images/competitive.png) | ![Pricing](docs/images/pricing.png) |

> The screenshots above are a **real, end-to-end launch** PMM OS produced for a fictional company (*Plotline* — self-serve product analytics). The whole thing — positioning statement, message house, battlecards, pricing logic, GTM plan, PLG loops, coach review — lives in one [`kit-content.json`](demo/plotline-launch/kit-content.json) and builds to one HTML file. Open [`demo/plotline-launch/`](demo/plotline-launch/) to click through it. Not a SaaS? [`demo/enamel-it/`](demo/enamel-it/) is the same OS run for a **geo-bound B2B service** (a dental-IT MSP): local events + channels desks, Google-review VoC, retainer pricing, and a referral engine instead of PLG.

## Quick start

**Claude Code** — one command, which registers the marketplace and installs the plugin for you:

```bash
npx pmm-os install
```

Or do it by hand inside Claude Code (both steps — the first only adds the catalog):

```
/plugin marketplace add buildingwithai/pmm-os
/plugin install pmm-os@pmm-os
```

**Codex**:

```bash
codex plugin marketplace add buildingwithai/pmm-os
codex plugin add pmm-os@pmm-os
```

Then restart, or run `/reload-plugins`. Plugin skills are namespaced, so they're
`/pmm-os:<skill>`:

```
/pmm-os:product-marketing-os      run the whole chain: grounding → research → strategy → launch kit
/pmm-os:pmm-positioning-exercise  or jump straight to a specialist
/pmm-os:pmm-pricing-packaging
/pmm-os:pmm-launch-kit
```

You don't have to use slash commands at all — just say *"take Plotline to market"* and the right
skills get picked up. Ask for a launch and PMM OS produces the strategy **and** the clickable kit;
markdown alone is never the finish line.

`npx pmm-os doctor` checks your environment · `npx pmm-os update` upgrades ·
`npx pmm-os setup` installs the optional research stack.

> Needs Claude Code **2.1.143+** (May 2026) or Codex with plugin support. On Codex, plugin hooks
> stay inactive until you review and trust them — Codex will prompt you.

**Your PMM OS workspace, inside Codex and Claude Code.** The plugin also adds the PMM OS
connector: battlecards (shown as cards where the app supports them), search, the feature
comparison, starting work for your agent, and saving what you make here as a PMM OS page
(`save_page`, `list_pages`), so a teardown or launch kit drafted in your terminal shows up for
the whole team. Sign in once with `codex mcp login pmm-os` in
Codex, or `/mcp` in Claude Code. On your own PMM OS address, copy the two commands from
**Settings > Plugin** instead.

## The quality architecture (v3) — the consulting-grade bar

v3 wires a consulting-grade operating discipline through the whole pipeline, distilled from the
MBB working canon and field-researched one-pager formats:

- **The two-product contract** — every engagement ships the **research library** (cited,
  two-altitude desks; every claim clicks through to its source) *and* the **deliverable suite**
  (positioning one-pager, messaging house, persona cards, battlecards with VARS objection
  handling, pricing, GTM-on-a-page — each backed by a working doc whose claims `@`-link to the
  findings that justify them).
- **Stage 0 product grounding** — when your product has a codebase, the code is read *first*;
  capability claims cite `path:line`. Truth order: code > founder artifacts > description.
- **The Plan gate** — no research call before a day-1 hypothesis (with named kill conditions)
  and a MECE issue tree exist. Pivots are logged, never silent.
- **The adversarial pass** — every desk hunts for evidence *against* its own finding before it
  closes. Refuting the hypothesis is a valid, valuable outcome.
- **The score gate** — deliverables ship at ≥24/33 on an 11-row scorecard (answer-first, action
  titles, so-what density, typed + dated evidence, honesty…), coach-reviewed, weakest row first.
- **The workspace** — the launch kit is a Notion-shaped research workspace: filterable Findings /
  Evidence / Events databases, a side peek that opens any citation's source record, `@`-mentions
  with backlinks, markdown shortcuts, and an in-kit **Generate with AI** queue that a Claude Code
  session fulfills against the evidence.

## What's inside

**46 skills**, organized as one system:

| Area | Skills |
|---|---|
| **Research (built-in)** | `pmm-research-brief` · `pmm-research-desk` · `last30days` · `agent-reach` |
| **Orchestrators** | `product-marketing-os` · `agentic-marketing-orchestrator` · `product-lifecycle-os` · `plg-gtm-strategy` |
| **Positioning & messaging** | `pmm-positioning-exercise` · `pmm-positioning-audit` · `pmm-messaging-positioning` · `pmm-messaging-hierarchy` · `pmm-message-market-fit` · `pmm-adaptive-messaging` |
| **Research & audience** | `pmm-customer-research` · `pmm-personas` · `pmm-icp-definition` · `pmm-voc-synthesis` · `pmm-product-context` |
| **Competitive** | `pmm-competitive-intelligence` · `pmm-battlecard` · `pmm-competitive-landing-page` |
| **Pricing** | `pmm-pricing-packaging` · `pmm-pricing-analysis` |
| **Launch & GTM** | `pmm-go-to-market` · `pmm-launch-brief` · `pmm-campaign-brief` · `pmm-feature-announcement` · `post-launch-learning-loop` |
| **Sales & GTM engineering** | `sales-enablement` · `pmm-sales-narrative` · `pmm-outreach` · `gtm-account-research` · `gtm-icp-scoring` · `gtm-signal-campaign` · `gtm-weekly-context-update` |
| **Content & SEO/AEO** | `pmm-content-writer` · `pmm-aeo-geo` · `osp-value-map` · `osp-content-optimizer` · `osp-technical-marketing` |
| **Production** | `pmm-artifact-factory` · `pmm-launch-kit` · `prd-prototype-factory` · `pmm-coach` · `prove-it-works` |

Three things make them work as a unit:

- **A deep framework library** — ~76k lines of frameworks, worksheets, templates, checklists and glossaries across 9 domains (positioning, messaging, competitive intelligence, personas, pricing, product launch, rollout, sales enablement, strategic thinking). 43/46 skills cite the exact docs they apply.
- **One depth standard** — every section must be *specific, complete, reasoned, and evidenced* — never a generic one-liner. Enforced in the skills, the prompt hook, and a final QA gate. "Depth is not length" — it won't pad, it goes deeper.
- **Smart routing** — sharpened, disambiguated triggers ("use this, not that") plus a hook that surfaces the right skills and always routes a launch to the interactive kit.

## Built-in research (two engines, on purpose)

Good marketing starts with what real people actually say. PMM OS ships **two
independent, complementary research engines** — run them separately and you get two
source pools instead of one:

- **`last30days`** — an *engagement-ranked, last-30-days* engine. Pulls Reddit, X,
  YouTube, TikTok, Hacker News, Polymarket, and GitHub, **scores by upvotes, likes,
  and real money**, and synthesizes a brief with verbatim community quotes. Best for
  *"what are people actually saying / sentiment / what's trending."* Self-contained
  Python (3.12+); Reddit/HN/Polymarket/GitHub work zero-config.
- **`agent-reach`** — a *breadth-first fetch/read router* across 10 channels, strong
  exactly where the other is thin: **LinkedIn, RSS, Exa search, reading any URL, and
  Whisper transcription** for audio and video with no captions. Best for *"fetch/read
  this, search this platform."* Opt-in: `npx pmm-os setup` (it installs Python
  packages and a headless browser, so it asks first). Its five China-market channels
  are deliberately not routed — see `scripts/patch-agent-reach-trim.py`.

Both are vendored into the plugin so research works on a fresh marketplace install
with **no quality degradation** — same depth as running them standalone. Refresh from
upstream anytime with `bash scripts/sync-research-engines.sh`. For VoC, competitive,
or any "what do people think" task, PMM OS runs **both** and synthesizes.

## Research Desks — research that produces artifacts

**It starts with a brain-dump.** You rarely have clean parameters — you have *"I've got a
product called X, it does A/B/C, I want to launch it."* `pmm-research-brief` is the front
door: it distills that ramble into a **Product Brief** + a **complete, mandatory Research
Plan across all ten desks** (product, customer, competitive, market, pricing, channels,
analyst/KOL, events, reviews, GTM/launch) — scoped with named competitors, segment, and events —
then runs the full sweep. Nothing is optional; a thorough PMM researches all of it. From there:

Research isn't one undifferentiated blob. A **research desk** (`pmm-research-desk`) is a
domain owned by a senior specialist's head. It loads that specialist's question set,
**fans it out across both engines** (~15–30 scoped calls — neither engine takes a batch,
so the desk decomposes), captures **sourced** evidence into `.agents/research/evidence.md`,
and emits a structured **artifact** into the dashboard. The Events Desk, for example,
ranks the conferences your ICP actually attends, by relevance vs. cost:

![Events Desk — ranked conference targets](docs/images/events-desk.png)

That artifact is built from a template the skills already carry (22 fill-in templates —
battlecards, canvases, pricing matrices, RACI… — plus 13 one-pager formats), hydrated by
the evidence.

**All ten desks ship** — product, customer, competitive, market, pricing, channels,
analyst/influencer, events, reviews, and GTM/launch — each producing its skill's *real* deliverable
in the dashboard (a competitor matrix + battlecard, a persona one-pager + ICP, a pricing
comparables matrix, a SWOT / Five-Forces / PESTEL category brief, a ranked channel map, a
KOL list, a ranked events table, a launch-tactics map…):

![Market Desk — SWOT + Porter's Five Forces category brief](docs/images/market-desk.png)

And research is the **hard gate** before strategy: a launch / positioning / pricing
deliverable won't ship until the desks that feed it have run and the ledger holds their
sourced sections — so output is grounded and cited, never invented.

## How a launch flows

```
brain-dump → research brief → research desks → positioning → messaging → pricing → competitive
      → GTM plan → artifacts → PMM Coach review → ✅ interactive launch kit → measurement → iteration
```

A launch or GTM motion **always** ends by building the kit (the wiring makes it the required final step), so you finish with a clickable hub, not a folder of docs.

## Build a kit from your own strategy

The generator is zero-dependency Node. Author one `kit-content.json` and build — no copying:

```bash
node skills/pmm-launch-kit/scripts/build-kit.mjs <your-launch-folder>
# → <wordmark>-launch-kit.html  +  generated-docs/*.md  +  deck.md (Marp → pptx/pdf)
```

Everything is one source of truth: `kit-content.json` → HTML app + markdown mirrors + a slide deck, all driven by a uniform block registry, so new block types and new export targets are additive.

## Credits & license

MIT © Jovanny Tovar. PMM OS adapts and unifies a number of open marketing skill sets — most notably the deep PMM framework library from [`buildingwithai/skills`](https://github.com/buildingwithai/skills) (MIT) — and includes methodology from Open Strategy Partners (CC BY-SA 4.0). All upstream attributions are preserved in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). See [`LICENSE`](LICENSE).
