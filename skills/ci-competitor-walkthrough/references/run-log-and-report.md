# Run log and final report

## Run log (checkpoint file)

Path: `.agents/research/walkthroughs/<yyyy-mm-dd>-<competitor-slug>.md`. Update it after every
completed step, so a crash or reset can resume from it. **Never** write passwords, codes,
cookies, upload URLs or tokens into it.

```markdown
# CI walkthrough: <Competitor> (<yyyy-mm-dd>)

PMM OS: <host> · workspace <id> · flow: executor (job <id>) | analyst
Records: competitor <id> · our product <own_product id> · battlecard card-<id> (rev <n> at start)
Computer: <Rakazo / Claude Code / Codex> · Chromium research account <email shown in avatar>
Next action: <the single next step>

## Scope (confirmed by <user> on <UTC date>)
| Feature (id) | Scenario (id) | plan | permissions | input | expected |
|---|---|---|---|---|---|

## Terms decision
- Decision: clear | limits | unclear | prohibited → proceeded | asked user | stopped
- Read: <doc>, <url>, updated <date>, retrieved <UTC>, sha256 <hash>, copy <path>
- Clauses: <doc> §<n> "<verbatim>" (<category>)
- User decision: <option>, by <name>, <UTC>

## Sign-in
- Method: Sign in with Google (<research email>) | other: <what>
- Takeovers: <UTC> <reason> → <outcome>
- Landed on: plan <tier> · role <owner/admin/member> · trial <n days> · visible gates <…>

## Claims inventory
| Claim (quote) | Source URL | Read (UTC) | Tier | Feature → scenario | Test? | Claim obs id |
|---|---|---|---|---|---|---|

## Segments
| File | Start epoch | Duration s | Bytes | W×H | sha256 (local) | Clip id | sha256 (server) match |
|---|---|---|---|---|---|---|---|

## Gaps
| Segment boundary | From–to (epoch) | Reason | Research action during gap? (must be "no") |
|---|---|---|---|

## Moments
| Segment | Offset s | What happened | x,y % | Annotation id |
|---|---|---|---|---|

## Derived cuts (local only)
| Output | Source file | Source sha256 | In–out s | Output sha256 |
|---|---|---|---|---|

## PMM OS writes
| Tool | Record id | operationKey | Result (id / code) |
|---|---|---|---|

## Blockers and needs-the-user
- <UTC> <blocker> → <who must act, what exactly>
```

## Final report (what you send the user)

Lead with coverage. Then report per competitor. End with everything that needs the user, in
one numbered list. Use the exact outcome values. No adjectives the evidence doesn't carry.
Keep the report about this evidence. Cite each source page by title and URL, but don't restate
the competitor's plan or price tables: they belong in a pricing analysis
(`pmm-pricing-analysis`), not here.

```markdown
## CI walkthrough report: <scope> (<UTC date>)

**Coverage**
- <Scenario A>: <n> of <N> confirmed competitors tested. observed <a> · failed <b> · blocked <c> · not_found_in_scope <d> · inconclusive <e> · not_tested <f>. Unresolved: <names>.
- Baseline (our product, <own_product id>): <outcome> (<observation id>) | not run: <why>.

### <Competitor>
- **Terms:** <decision>. <doc> <url> (updated <date>, read <UTC date>). <clause and user decision if any>
- **Access:** <Google sign-in / blocked at …>; plan <plan name>; role <role>; takeovers <n> (<what>)

| Feature / scenario | Outcome | Conditions (plan · role · input · date) | Proof (observation · clips · sha256) | Source |
|---|---|---|---|---|
| SSO / Okta admin setup | `blocked` | Free trial · Owner · synthetic IdP metadata · 2026-10-19 | obs-acme-sso-20261019-1 · clip-…-1a, -1b · 9f2c…, 41ab… | https://acme.example/docs/sso (claim: "SSO on all plans") |

- **Recording gaps:** <segment>: paused <n> s for <reason>; no research action during the gap.
- **Battlecard:** proposal `<prop id>` on `card-<id>` (base rev <n>): pending human review in PMM OS.
  - Quick hits (talkingPoint): <one-line summary of the change>
  - Buyer question (objection): <unchanged | change>
  - Evidence limits (limitations): <change>
- **Coach review:** <top gap found and fixed, or what remains open>
- **Blockers:** <specific, with where and when>

### Needs you
1. Review proposal `<prop id>` (<competitor>) in PMM OS. I did not approve it.
2. Create the scenario "<name>" under feature "<name>": mode <…>, plan <…>, permissions <…>, input <…>, expected <…>.
3. Terms decision for <competitor>: <clause>. Choose a, b or c.
4. Takeover needed for <competitor>: <what> (e.g. phone verification).
```

If `.agents/research/evidence.md` exists, add one line per observation under `## Competitive`:

```markdown
- <Competitor> · <feature/scenario> · `<outcome>` · <conditions> · PMM OS <observation id> · source <url> · <UTC date>
```
