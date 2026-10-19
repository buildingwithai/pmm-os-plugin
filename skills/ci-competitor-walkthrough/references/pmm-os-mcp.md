# PMM OS MCP: the tools this skill uses

This page reflects the PMM OS CI MCP server (`pmm-os-competitive-intelligence`). Field names are
exact, and inputs are strict: an unknown or missing field is rejected with `INVALID`. Every
write needs an `operationKey`.

## Connect

```bash
claude mcp add --transport http pmm-os "https://<host>/api/mcp?workspace=<workspace id>"
```

For Codex, add the same URL as an HTTP MCP server in `~/.codex/config.toml`. The first call opens
a PMM OS sign-in page. After the user signs in, the agent acts with the user's current role in
that workspace. If the user is removed from the organization, access stops on the next call.

## Read tools

| Tool | Input | Returns / use |
|---|---|---|
| `list_work` | `{}` | Start here. `workspace {name, productName}`, `competitors[] {id, name, website, kind}`, open `discoveries[]` (competitor searches that are queued or yours), all `suggestions[] {id, name, website, status}`, and open `jobs[]` that are queued or yours (last 3 checkpoints each). |
| `search` | `{"query": "<text, max 500>"}` | Up to 50 `{id, kind, title, text}` with `kind` ∈ `competitor`, `evidence`, `battlecard`, `feature`. `""` lists everything, up to 50. Scenarios are **not** searchable. |
| `get_feature_comparison` | `{"featureId", "scenarioId"}` | One row per competitor (our product included, `competitor.kind: "own_product"`), each with the `scenario`, its `observations`, and `outcome` `evidence_available` or `not_tested`. `INVALID` means the scenario does not belong to that feature. |
| `get_assignment` | `{"id"}` | Job: `competitorId`, `scenarioId`, `brief`, `plan[]`, `state` (`queued`, `accepted`, `blocked`, `completed`, `cancelled`), `executorId`, `checkpoints[]`, `blocker`. |
| `get_evidence` | `{"id", "revision"?}` | The observation at that revision, plus its `scenario` (plan, permissions, input, expected), `competitor` and `clips` with annotations. |
| `assess_evidence` | `{"id", "revision"?}` | `outcome`, `summary`, `limits[]` (adds "capture date unknown" and "no original recording"). `supportsGeneralAccuracy` is always `false`. |
| `get_battlecard` | `{"id"}` | `content {talkingPoint, objection, limitations}`, `revision`, `observationIds`, `evidenceRevisions`, `stale`, `history`, `supportingEvidence`. |
| `get_proposal` | `{"id"}` | `before`, `after`, `baseRevision`, `status` (`pending`, `approved`, `rejected`), `rationale`, `supportingEvidence`. |

Scenario IDs come from an assignment (`get_assignment`), from existing evidence (`get_evidence`
returns `scenario`), or from the user.

## Write tools

Each write takes `operationKey` in addition to the fields listed.

| Tool | Fields | Notes |
|---|---|---|
| `record_observation` | `id`, `competitorId`, `scenarioId`, `title`, `actual`, `limitations`, `outcome`, `capturedAt`, `sourceLabel`, `sourceUrl`, `sourceReceipt`? | The competitor and scenario must already exist. `capturedAt` is a UTC ISO datetime ending in `Z` (`"2026-10-19T14:05:00Z"`) or `null`. `sourceUrl` must be `https://…` or `""`; the key is required either way. `title`, `actual`, `limitations` and `sourceLabel` must be non-empty (max 12,000 characters). |
| `create_clip_upload` | `metadata: {id, observationId, name, mime, bytes, duration, width, height}` | **No operationKey.** Returns `{uploadUrl, expiresInMinutes: 60}`. See [upload.md](upload.md). |
| `finish_clip_upload` | `storageId`, `metadata` (identical), `operationKey` | Validates the file, stores the SHA-256 and attaches the clip. Returns `{uploadId, sha256, attached}`. |
| `attach_clip` | `uploadId`, `operationKey` | Recovery only, for a receipt from this same actor and workspace whose attach did not complete. It never takes URLs or file paths. |
| `annotate_clip` | `clipId`, `annotation: {id, start, end, text, kind, x, y, width?, height?}` | See "Annotation schema" below. Each call creates a new evidence revision. |
| `propose_update` | `id`, `battlecardId`, `baseRevision`, `after: {talkingPoint, objection, limitations}`, `observationIds` (1 to 50), `rationale` | All three `after` keys are required (each may be `""`). Every observation must belong to the card's competitor. |
| `build_test_plan` | `id`, `competitorId`, `scenarioId`, `brief` | Queues a job. It does not start anyone or anything. Analyst, reviewer and admin roles can call it; an executor cannot. |
| `accept_job` | `id` | Executor role only. Only works on a `queued` job. |
| `checkpoint_job` | `id`, `text`, `state` (`accepted`, `blocked`, `completed`), `blocker` | Only the assigned executor can call it. `blocker` is required: `""` unless `state` is `blocked`, when it must name the specific blocker. |
| `cancel_job` | `id` | Keeps checkpoints and evidence. Use it only when the user asks. |
| `accept_discovery` | `id` | Claims a `queued` competitor search. After that only you can add to it. |
| `suggest_competitor` | `id` (max 155), `discoveryId`, `name`, `description`, `website`, `reason`, `sourceUrl` | Needs a search you accepted. `website` and `sourceUrl` are `https://…` or `""`; `name` and `reason` are non-empty. `CONFLICT` if the name or website host matches a competitor or any earlier suggestion, including dismissed ones. A person says yes (creates competitor `<id>` and battlecard `card-<id>`) or no in PMM OS. |
| `complete_discovery` | `id`, `summary` | Closes a search you accepted. The summary says how you searched and what you found. |
| `review_proposal` | — | **Never call it.** Approval belongs to a human reviewer. |

**Not available over MCP:** creating competitors directly (suggest them instead), features or scenarios; asking for or deciding on a competitor search; revising an observation;
recording standalone claims or recommendations. If an observation you wrote is wrong, record a new,
corrected observation and tell the user which one supersedes which. Give the user the exact
values for anything that must be created in the dashboard.

## IDs and operation keys

- Pattern `^[A-Za-z0-9][A-Za-z0-9:_-]*$`, up to 160 characters. That means letters, digits, `:`, `_` and `-`, with no spaces or dots.
- Record IDs share **one namespace per workspace** (competitors, features, scenarios, observations, clips, proposals, jobs, battlecards, competitor searches and suggestions). Make them unique and readable:
  - observation: `obs-<competitor>-<feature>-<yyyymmdd>-<n>`, e.g. `obs-acme-sso-20261019-1`
  - clip: `clip-<competitor>-<feature>-<yyyymmdd>-<n><letter>`, e.g. `clip-acme-sso-20261019-1a`
  - proposal: `prop-<competitor>-<yyyymmdd>-<n>`
  - job: `job-<competitor>-<feature>-<yyyymmdd>`
  - annotation: only needs to be unique within its clip, e.g. `ann-01`
- `operationKey` makes a write idempotent. Derive it from the action and the record ID, e.g. `obs:obs-acme-sso-20261019-1`, `finish:clip-acme-sso-20261019-1a`, `ann:clip-acme-sso-20261019-1a:ann-01`, `prop:prop-acme-20261019-1`, `ckpt:job-acme-sso-20261019:terms`.
  - Retrying the same payload with the same key is safe; you get the original result back (`replayed`).
  - The same key with a different payload returns `CONFLICT`.
  - Never reuse a key for a different change, and never mint a new key to get around a `CONFLICT`.

## Roles and scope

| Role | Can do here |
|---|---|
| `executor` | `accept_job`, `checkpoint_job`, and the competitor search tools (`accept_discovery`, `suggest_competitor`, `complete_discovery`). It can call `record_observation`, the uploads, `annotate_clip` and `propose_update` **only** for a competitor and scenario of a job it has accepted (state `accepted` or `blocked`). It cannot call `build_test_plan`. |
| `analyst` | `build_test_plan`, `record_observation`, the uploads, `annotate_clip`, `propose_update`, and the competitor search tools. It cannot accept or checkpoint jobs. |
| `reviewer`, `admin` | Everything an analyst can do, plus `review_proposal`. This skill still never calls it. |
| `viewer` | Read only. |

No tool reports your role. If you were given an assignment ID, follow the executor flow.
Otherwise follow the analyst flow. A `FORBIDDEN` on a write means a role or scope problem:
report it, and don't retry variants.

## Errors

Failures come back as text: `<CODE>: Request failed or is not authorized. Refresh access or
inspect the exact proposal conflict.`

| Code | Meaning | Do |
|---|---|---|
| `INVALID` | Schema or rule failure: bad field, non-https URL, bad datetime, metadata that doesn't match the file, annotation outside the clip | Fix the payload and retry. A failed write records nothing, so the same operationKey can be reused. |
| `FORBIDDEN` | Role, membership, assignment scope, or an upload receipt that belongs to someone else | Stop and report it. Re-authentication may be needed. |
| `NOT_FOUND` | A referenced ID does not exist in this workspace | Re-read with `search` or `get_assignment`, or ask the user to create the record. |
| `CONFLICT` | The ID already exists, the key was reused with a different payload, the card or evidence changed, or the proposal was already reviewed | Re-read, reconcile, then redraft against the current revision. |
| `LIMIT` | File over 50 MB, the pending-upload quota, or the workspace size limit | Split the file, or finish pending uploads first. Report workspace limits to the user. |

## Annotation schema

| Field | Rule |
|---|---|
| `id` | ID pattern; unique within the clip |
| `start`, `end` | Seconds from the start of **this clip**; `0 ≤ start < end ≤ clip duration` |
| `text` | 1 to 12,000 characters: what happened |
| `kind` | `caption`, `arrow` or `circle` |
| `x`, `y` | 0 to 100, as a percent of the original frame's width and height from the top-left. For `arrow`, this is the point the arrow tip touches. For `caption`, use `50`/`50` (the dashboard's convention). |
| `width`, `height` | Required for `circle` (1 to 100), and the circle must fit inside the frame. Some deployments don't accept circles yet; if one is refused, use an arrow plus a caption. |

## Outcome enum

`observed` (Observed) · `not_tested` (Not tested) · `blocked` (Blocked) · `failed` (Failed) ·
`inconclusive` (Inconclusive) · `not_found_in_scope` (Not found in tested scope). When to use each
is defined in SKILL.md, Step 5.

## Battlecard content

| Field | Shown in PMM OS as | Write |
|---|---|---|
| `talkingPoint` | Quick hits | What reps can say, bounded by the evidence |
| `objection` | Buyer question | The question the buyer asks, which this evidence answers |
| `limitations` | Evidence limits | Conditions (plan, role, input, date), gaps, untested areas |

Plain text or simple markdown paragraphs and `- ` bullets. Inline evidence link:
`[@<observation title>](pmm://source/<observationId>)`. When a proposal is approved it replaces all
three fields, so copy any unchanged field exactly from `get_battlecard`.
