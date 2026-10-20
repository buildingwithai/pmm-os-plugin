# Research a fake, or build one

## Research a fake (when the catalog has nothing)

Spend a few minutes, not an hour. Search for:
- `<service> emulator`, `<service> local development`, `<service> mock server`
- `<service> openapi spec` (then Prism can serve it)
- `<service> test mode` or `sandbox` (a free test environment on the real API)
- `npx emulate list` (emulate keeps adding services)

Pick a result only if it is free, open source or official, updated in the last year, and covers
the calls your code makes. Note what you found in the repo's emulator list (below), even when
the answer is "none, built our own".

## Build one

Build only the calls your code makes, not the whole API.

1. **List the calls.** Find every request your code sends to the service: method, path, the
   fields it reads from the response. That list is the emulator's scope.
2. **Get the real shapes.** In order: the service's OpenAPI spec, its official SDK types, its
   docs, or one recorded real response from a test account. Never invent fields.
3. **Pick a home.**
   - `npx emulate init --custom <name>` scaffolds a custom emulator that runs next to the
     built-in ones (`npx emulate start --watch` while you build it).
   - Or follow the repo's own pattern. Look for files named `*-emulator.*` or `fake-*` first,
     and copy their style.
4. **Keep state in memory.** Creating a thing, then reading it back, must work. Add `reset()`
   so every test starts clean, and a seed option for test data.
5. **Fake the failures too.** Add switches for the errors your code must handle: 401, 404, 429
   rate limit, 500, timeout. Bugs hide there.
6. **Put it behind the same interface as the real client.** The app picks real or fake from
   config, never from code edits.
7. **Keep it honest with a contract test.** Write one small test that runs the same calls
   against the fake and against the real service's sandbox or test mode, and compares the
   response shapes. Run it on demand or nightly, not on every push, and skip it when no test
   key is set. This stops the fake from drifting from the real API.

## Record and replay (good for LLMs and services with no sandbox)

Record real responses once with MSW, nock, Polly.js or VCR.py, scrub secrets and personal data
from the recordings, commit them as fixtures, and replay them in tests. Re-record when the API
changes.

## Keep a list in the repo

Keep `docs/emulators.md` (or the repo's existing equivalent) with one row per service: the
fake used, how to start it, and the contract test, if any. Read it first next time, and update
it in the same change that adds or changes a fake.
