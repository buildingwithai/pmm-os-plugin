# Recording with pmm-record

`pmm-record` captures the agent computer's `$DISPLAY` with ffmpeg as H.264 MP4 into
`~/recordings/`. Use it by default. Recordly is optional, for polished exports only.

## Commands

| Command | Effect | Output |
|---|---|---|
| `pmm-record start <slug>` | Starts a capture to `~/recordings/<slug>-<n>.mp4` | `{"segment": "<path>"}` |
| `pmm-record pause` | Closes the current segment; nothing is captured until resume; the gap is logged | — |
| `pmm-record resume` | Starts a new segment (new file, time restarts at 0) | — |
| `pmm-record stop` | Finalizes everything | `{"segments": [{path, bytes, duration, width, height, mime, sha256}], "gaps": [{from, to, reason}]}` |
| `pmm-record info <file>` | Inspects one file | `{bytes, duration, width, height, mime, sha256}` |
| `pmm-record trim <in> <start_s> <end_s> <out>` | Writes a derived cut; `<in>` is untouched | — |
| `pmm-record join <out> <in1> <in2> ...` | Writes a derived concatenation; inputs untouched | — |

Slugs are lowercase with hyphens: `<competitor>-onboarding`, `<competitor>-<feature>`,
`ours-<feature>`.

## Before the first real run

1. `pmm-record start preflight`, wait about 5 seconds, then `pmm-record stop`.
2. Confirm `duration` > 0, that `width`×`height` matches the screen, `mime` is `video/mp4`, and `bytes` > 0.
3. Never upload the preflight file.

If capture fails (no `$DISPLAY`, ffmpeg missing, zero bytes), stop and report it. A test without a
recording is not evidence for this skill.

## Pause rules

Pause **before** and resume **after**:

- typing or revealing a password, a one-time code, a recovery code or an API key;
- an inbox (open only the verification email, then leave);
- payment or billing screens;
- an OAuth consent screen, while it's being handed to the user;
- any takeover by the user;
- personal data unrelated to the test (notifications, other tabs, other accounts).

Log the reason in the run log the moment you pause:

```text
1729347312  PAUSE  password creation via takeover
1729347371  RESUME
```

`pmm-record stop` lists the same gaps. Every gap goes into the observation's `limitations`, e.g.
"Recording paused 41 s at account creation for password entry (user takeover); no research
action happened during the gap." Never perform the research action itself during a gap.

## Segment sizing and the 50 MB limit

- PMM OS accepts at most **52,428,800 bytes (50 MB) per file**, and a workspace can hold at most 50 MB of pending (unfinished) uploads at once.
- Close a segment at each meaningful step, aiming for about 5 minutes or less. Use `pause`/`resume` for a clean boundary, or `stop` then `start` with a new slug.
- After each segment, run `pmm-record info <file>`. If `bytes` > 52,428,800, split it for upload:
  1. Choose N parts so each is under 50 MB: `N = ceil(bytes / 45,000,000)`, with a margin.
  2. `pmm-record trim <seg> 0 <d/N> <seg>-part1ofN.mp4`, then `<d/N> <2d/N>` for part 2, and so on to the end. Parts must be contiguous and must cover the whole segment.
  3. Run `pmm-record info` on each part. The durations must add up to within about 1 second of the original.
  4. Upload the parts as separate clips named `<segment name> part k of N (<from>-<to> s)`. Log the original's sha256 in the run log and the observation's `limitations`.
  5. Keep the unsplit original locally. Never delete it without the user's say-so.

## Moment log, the source of every annotation

At each event that matters, append a line to the run log under `## Moments`:

```text
<epoch s>  <segment file>  <what happened, plainly>  <where: UI element and approximate x,y %>
1729347402  acme-sso-1.mp4  Opened Settings → Security → SSO  left nav, ~12,48
1729347431  acme-sso-1.mp4  Uploaded test IdP metadata (synthetic)  upload button ~63,40
1729347459  acme-sso-1.mp4  Error: "SAML is available on Enterprise"  banner ~50,18
```

Take segment start epochs from the time you ran `start`/`resume` (`date -u +%s`). Then
`offset = epoch - segment_start`.

### Confirm moments and positions from the actual frame

```bash
mkdir -p ~/recordings/frames
ffmpeg -loglevel error -ss 57 -i ~/recordings/acme-sso-1.mp4 -frames:v 1 ~/recordings/frames/acme-sso-1-57s.png
```

Open the PNG. Adjust the offset until the frame shows the event, then measure the target:
`x = pixel_x / width × 100`, `y = pixel_y / height × 100`, rounded to one decimal. These go
straight into `annotate_clip`.

## Annotation plan (applied after upload)

Per clip, prepare:

1. **Conditions caption** at `0` to `3` s: `"Acme · Free trial · Owner role · 2026-10-19 · input: sample-idp-metadata.xml (synthetic)"`.
2. **One caption per key moment** covering what happened, over the seconds it is on screen: `"Uploads IdP metadata; Acme shows 'SAML is available on Enterprise'"`.
3. **An arrow** on the UI element that proves the point (the error banner, the toggle, the output field), with the tip at its `x`,`y` and a short label.
4. **A gap caption** in the last 2 seconds before a pause: `"Recording paused for password entry; continues in the next clip"`.

Write captions in the present tense and keep them factual. Never interpret ("Acme can't do SSO")
or show emotion. The interpretation belongs in the observation and the proposal, where a human
reviews it.

## Derived cuts (optional, local)

- Write only into `~/recordings/derived/`. Never write over a captured segment.
- Name cuts so their provenance is visible: `acme-sso-1__cut-42-71s.mp4`, `acme-sso__highlight.mp4`.
- Log each cut in the run log: source file, source sha256, in/out seconds, and the output sha256 (`pmm-record info`).
- Cuts are for the user's slides or chat. PMM OS stores every upload as an original, so upload a highlight only if the user asks. If they do, name it `DERIVED cut of <original name> <in>-<out> s`, upload the original first, and say so in a caption at 0 s.

## Recordly (optional)

Recordly (open-source recorder and editor) may be installed for a polished export with zooms,
cursor effects and text. Use it only when the user wants a presentation video. Rules:

- The source is still the pmm-record original. Recordly's export is a derivative.
- Keep the Recordly project file **and** the raw media it references together. A `.recordly` file alone cannot be restored.
- Never let a Recordly export replace an original in PMM OS.

## Retention

Keep the originals, `pmm-record stop` JSON, derived cuts and frames until uploads are verified
(server sha256 matches) **and** the user says what to keep. Never delete recordings on your own
initiative.
