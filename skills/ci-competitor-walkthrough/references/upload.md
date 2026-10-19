# Upload originals to PMM OS and annotate

Sequence per test: **observation → for each segment: create upload, POST bytes, finish upload →
annotations → verify**. Only then draft the proposal (SKILL.md, Step 8). Attaching a clip and
each annotation bump the observation's revision, and a proposal drafted earlier would conflict.

## Limits (enforced server-side)

| Limit | Value |
|---|---|
| Size per file | ≤ 52,428,800 bytes (50 MB). The schema accepts larger values, but upload creation refuses them with `LIMIT`. |
| Pending uploads per workspace | ≤ 20 files and ≤ 50 MB in total. Finish each upload before creating the next. |
| Upload URL lifetime | 60 minutes, single use |
| Unfinished upload receipt | Expires after 1 hour |
| Containers / `mime` | `video/mp4`, `video/webm`, `video/quicktime`, `video/ogg` (pmm-record produces `video/mp4`) |
| `bytes` | Must equal the file size exactly |
| `width`, `height` | Must equal the video's frame size exactly |
| `duration` | Must be within max(0.25 s, 2 %) of the measured duration |

Take `bytes`, `duration`, `width`, `height`, `mime` and `sha256` from `pmm-record stop` or
`pmm-record info <file>`, and pass the numbers through unchanged.

## 1. record_observation

```json
{
  "id": "obs-acme-sso-20261019-1",
  "competitorId": "acme",
  "scenarioId": "sso-okta-admin",
  "title": "Acme SSO setup on Free trial (Owner role)",
  "actual": "As account Owner on the Free trial, Settings → Security → SSO opened a SAML form. Uploading the synthetic IdP metadata returned 'SAML is available on Enterprise'; no SSO connection could be created.",
  "limitations": "Free trial plan, Owner role, one run on 2026-10-19 with synthetic IdP metadata. Enterprise tier not tested. Recording paused 41 s at signup for password entry (user takeover); no research action during the gap. Does not establish behavior on other plans.",
  "outcome": "blocked",
  "capturedAt": "2026-10-19T14:52:10Z",
  "sourceLabel": "Hands-on test, pmm-record screen capture",
  "sourceUrl": "https://acme.example/pricing",
  "operationKey": "obs:obs-acme-sso-20261019-1"
}
```

- `capturedAt` is when the test was recorded, in UTC with `Z`. Use `null` only for claim-only records.
- `sourceUrl` is the https page you started from or the claim being tested, or `""`. Never use a private or tokenized URL.
- The outcome follows the evidence. In this example the feature sat behind a plan gate, so the outcome is `blocked`. It is not `failed` and not `not_found_in_scope`.

## 2. create_clip_upload (no operationKey)

```json
{
  "metadata": {
    "id": "clip-acme-sso-20261019-1a",
    "observationId": "obs-acme-sso-20261019-1",
    "name": "acme-sso-1.mp4",
    "mime": "video/mp4",
    "bytes": 18734211,
    "duration": 143.52,
    "width": 1920,
    "height": 1080
  }
}
```

The response is `{"uploadUrl": "https://…", "expiresInMinutes": 60}`. Treat `uploadUrl` like a
password: hold it in a shell variable, and never write it to the run log, chat or a file.

## 3. POST the bytes

```bash
UPLOAD_URL='<uploadUrl from step 2>'
SEG=~/recordings/acme-sso-1.mp4
curl -sS -X POST -H "Content-Type: video/mp4" --data-binary @"$SEG" "$UPLOAD_URL"
# → {"storageId":"kg2…"}
```

The `Content-Type` header must equal `metadata.mime`. If the POST fails or returns no
`storageId`, call `create_clip_upload` again with identical metadata to get a fresh URL, then POST
again. Partial transfers expire by themselves.

## 4. finish_clip_upload

```json
{
  "storageId": "<storageId from step 3>",
  "metadata": { "...": "exactly the same object as step 2" },
  "operationKey": "finish:clip-acme-sso-20261019-1a"
}
```

The response is `{"uploadId": "…", "sha256": "<hex>", "attached": …}`.

- Compare the returned `sha256` with pmm-record's. If they differ, stop. Report both hashes and don't annotate.
- `INVALID` with "metadata does not match": re-run `pmm-record info` and use its exact numbers. Never round `width` or `height`.
- A timeout or other unknown result: **don't** resend the same `storageId`. A storage object that was already staged returns `CONFLICT` ("already staged"). Instead:
  1. Call `get_evidence` on the observation. If `clips` lists your clip ID, the upload finished; carry on.
  2. If it doesn't, repeat steps 2 to 4 within the hour: identical metadata, a fresh `uploadUrl`, the same file, the new `storageId` and the **same** `operationKey`. The server recognizes the identical staged upload (same clip ID, actor, sha256 and metadata), discards the duplicate bytes and attaches the original.
  3. If more than an hour has passed since the first attempt, the receipt has expired. Report it rather than forcing anything.
- `attach_clip {"uploadId", "operationKey"}` needs an `uploadId`, which you only get from a successful finish or a receipt the user hands you. Normally you never need it.

The clip's ID for annotations is `metadata.id` (`clip-acme-sso-20261019-1a`).

Repeat steps 2 to 4 for every segment and part, one at a time, with letters `1a`, `1b`, `1c`….

## 5. annotate_clip

Caption (what happened, when):

```json
{
  "clipId": "clip-acme-sso-20261019-1a",
  "annotation": {"id": "ann-01", "start": 0, "end": 3, "kind": "caption", "x": 50, "y": 50,
    "text": "Acme · Free trial · Owner role · 2026-10-19 · input: synthetic IdP metadata"},
  "operationKey": "ann:clip-acme-sso-20261019-1a:ann-01"
}
```

Arrow (where):

```json
{
  "clipId": "clip-acme-sso-20261019-1a",
  "annotation": {"id": "ann-03", "start": 57.0, "end": 63.0, "kind": "arrow", "x": 50.4, "y": 18.2,
    "text": "Plan-gate message: 'SAML is available on Enterprise'"},
  "operationKey": "ann:clip-acme-sso-20261019-1a:ann-03"
}
```

Circle (optional; needs `width` and `height` and must fit the frame; some deployments refuse it):

```json
{"id": "ann-04", "start": 57.0, "end": 63.0, "kind": "circle", "x": 50.4, "y": 18.2,
 "width": 30, "height": 8, "text": "Plan-gate banner"}
```

Rules: `0 ≤ start < end ≤ clip duration`. Times are relative to **this clip**, so a split part
starts at 0 again. Annotation IDs must be unique within the clip. Retrying with the same
operationKey is safe. The same annotation ID with different content returns `CONFLICT`.

## 6. Verify

`get_evidence {"id": "obs-acme-sso-20261019-1"}` must show every clip (with name, bytes,
duration) and every annotation. Log the observation's current `revision`; `propose_update`
records evidence at that revision.

## Executor scope

If you act as an executor, every observation, upload, annotation and proposal must be for the
competitor and scenario of a job you have accepted (state `accepted` or `blocked`). Anything else
returns `FORBIDDEN`. Ask the user to queue the job (`build_test_plan` by an analyst) instead of
working around it.
