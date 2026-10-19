# Product grounding — PMM OS

Stage 0 per `pmm-product-context`. Truth order: code > founder artifacts > description.
Every capability below is classified **shipped / WIP / aspirational** against the repo at
commit `fdf2bd6`, and cited `path:line`.

## What it is, mechanically

A plugin for Claude Code and OpenAI Codex, distributed three ways: `npx pmm-os install`
(npm, `bin/cli.mjs:1`), `/plugin marketplace add buildingwithai/pmm-os` (Claude Code), and
`codex plugin marketplace add buildingwithai/pmm-os` (Codex). MIT, free, no account, no
server. v3.0.3.

## Capability inventory

| Capability | Status | Evidence |
|---|---|---|
| 46 skills, model-invoked, namespaced `/pmm-os:<skill>` | **shipped** | `skills/*/SKILL.md`, 46 dirs; validator asserts count |
| Framework library — ~75k lines across 9 domains | **shipped** | `skills/product-marketing-os/references/library/`, 74,710 lines |
| 22 fill-in templates + 13 one-pager formats | **shipped** | `skills/product-marketing-os/assets/` (22), `references/one-pagers/` (13) |
| Ten research desks | **shipped** | `references/research-desks/` — 10 files |
| Interactive launch kit generator, zero-dependency | **shipped** | `skills/pmm-launch-kit/scripts/build-kit.mjs`; verified: 174KB HTML + 18 md + Marp deck, node builtins only |
| Live kit editor (TipTap, slash-insert, drag-reorder) | **shipped, degrades** | `.kit-app.js:313` loads TipTap from esm.sh — offline falls back to plain contenteditable with a notice |
| Kit server with SSE live-reload on content save | **shipped** | `kit-server.mjs:79` |
| 6 lifecycle hooks (routing, policy, quality gate) | **shipped** | `hooks/hooks.json`, all six verified exit 0 from an installed path |
| `last30days` research engine — zero-config | **shipped** | `skills/last30days/`, vendored v3.11.1, needs Python 3.12+ |
| `agent-reach` — 10 routed channels (of 15 shipped) | **shipped, opt-in** | `skills/agent-reach/`; requires `npx pmm-os setup` (installs pip packages + headless browser) |
| Evidence ledger — research hydrates other skills | **shipped, convention** | `.agents/research/evidence.md`; enforced by prose + Stop hook, not by code |
| Research gate before strategy | **WIP** | `hooks/stop_quality_gate.py:57` — advisory `systemMessage`, was a hard block until this week |
| PMM OS Cloud (hosted workspace) | **aspirational for this repo** | split out to private `buildingwithai/pmm-os-web`; not installable, not referenced |
| Codex Plugins Directory listing | **aspirational** | manifests are valid and install today; directory submission not filed |

## Intent vs implementation gaps

1. **"Two research engines" is asymmetric.** `last30days` works with zero config; `agent-reach`
   needs an opt-in install of four pip packages and a headless WebKit. The README implies parity.
   A user who skips setup has *one* engine. `bin/cli.mjs` setup gate.
2. **Python 3.12+ is a real floor.** Stock macOS ships 3.9. Most first-time users have no working
   research engine until they install Python. `scripts/verify-research.sh:17`.
3. **The evidence ledger is a convention, not a mechanism.** Nothing prevents a skill from
   producing an ungrounded deliverable; the Stop hook now only advises.
4. **Zero external validation.** 0 stars, 0 forks, 0 issues at grounding time. No user has been
   observed completing a run. Every claim about outcomes is founder-asserted.
5. **Windows is unsupported in practice.** Hooks shell out to `python3`.

## Founder-asserted, not code-verified

- "Consulting-grade" / "better than a consultancy" (`references/deliverable-standard.md`) — a
  quality claim with no external rater.
- The ≥24/33 deliverable scorecard is self-scored by `pmm-coach`, i.e. the same model that wrote
  the artifact. Real, but not independent.

## What grounding changes downstream

Positioning may not claim proven outcomes, adoption, or time savings. The honest proof surface is
**inspectable artifacts** (two demo kits, a 75k-line framework library, a working generator) and
**mechanism** (research-gated chain, code-first grounding), not results.
