---
name: prove-it-works
description: Prove that code you build or change actually works, with real test runs, emulators for outside services, and screenshots of the screens you touched, before calling it done. Finds which outside services the code uses, picks or researches a fake for each, and builds one when none exists. Use when building or fixing an app, prototype, landing page, launch-kit app, or integration (for example output from prd-prototype-factory or pmm-launch-kit). Skip it for pure writing work like battlecards or messaging.
---

# Prove It Works

A claim that something works is worth nothing without proof. This skill is how an agent earns
trust: it shows the run, the result, and the screen.

## When to use it, and when not to

Use it when the work is code that people will run or see: an app, a prototype, a site, a
launch-kit app, an MCP tool, an integration.

Scale the proof to the risk:
- A typo, a copy edit, or a one-line config change: run the fast checks and stop.
- A quick throwaway prototype with no test setup: take a screenshot and say tests were skipped.
- The user says to skip tests: skip them and say so.
- A fake does not fit (the point is to check the live service, or a fake would cost more than
  the feature): test the real thing safely with test data, or say what was not tested.

## 1. Plan first (for anything bigger than a small fix)

- Write a short checklist before code. For each item, write how it will be proven: which test,
  which screen, which screenshot.
- Keep working until every box is checked. Do not stop at the first green step.

## 2. Read the repo's rules

- Read `AGENTS.md` and `CLAUDE.md` at the repo root and in the folder you change. Follow them.
- Use the repo's own test, typecheck and lint commands (package.json, Makefile,
  CONTRIBUTING.md).
- Read the repo's emulator list (`docs/emulators.md` or similar) if it has one.

## 3. Fake the outside services your change touches

An emulator is a local fake that answers like the real API and keeps its state in memory.
Tests then give a real pass or fail with no keys, accounts or cost.

1. **Find them.** Run the scanner from this skill's folder:
   `node scripts/find-outside-services.mjs <repo> [--json]`
   It lists each outside service the code uses (from dependencies, env vars and hostnames),
   with a suggested fake. Keep only the services your change actually calls.
2. **Reuse first.** Search the repo for an existing fake: `emulator`, `fake`, `mock`, `msw`,
   `nock`. If one exists, use it and extend it.
3. **Pick a ready-made one.** Check `references/emulator-catalog.md`. `npx emulate` covers
   GitHub, Slack, Stripe, Google, Microsoft, Resend, Clerk, Linear, Twilio, AWS and more.
4. **Research when nothing fits.** Follow "Research a fake" in
   `references/building-an-emulator.md`: look for an official emulator, a sandbox or test mode,
   or an OpenAPI spec you can serve with Prism.
5. **Build one when you will test it more than once.** Follow "Build one" in
   `references/building-an-emulator.md`: only the calls the code makes, real response shapes,
   state in memory, failure switches (401, 429, 500, timeout), the same interface as the real
   client, and one small contract test against the real sandbox so the fake stays honest.
6. **Write it down.** Add or update the row in the repo's emulator list in the same change.

## 4. Prove it with a real run

- Before you change code, record a baseline: how it looks and behaves now, and how fast. Compare
  against that baseline, not memory.
- Run the tests, typecheck and lint. For a bug, reproduce it first, then show the same check
  passing.
- Screenshot the product, not the tools. For each screen you add or change, a browser test
  (Playwright for web, Maestro for mobile or desktop) opens that screen in the app and saves a
  picture. If no test opens that screen yet and the project has a test setup, add one. When the
  repo's CI takes screenshots, link the one that shows your change.
- Look at the screenshots yourself. Check the change is visible, nothing nearby broke, and it
  works at phone width and in dark mode if the app has them.
- Drive the app the way a person does: click, type, scroll, wait. A user-path test does not pass
  because a script called an internal function, set storage, or clicked by JavaScript.
- Check the browser console and network for new errors while the flow runs.
- When a fake cannot stand in (a signed-in third-party site, a browser extension on a real page),
  do a final live check in a real browser (for example Chrome DevTools MCP). Use fakes for
  everything before that, so the live check is short.
- A passing build, a mock, or "it should work" is not proof. If you could not run something,
  say so plainly and why.

## 5. Before calling it done

- Re-read your own diff as a reviewer would. Remove extra explainer text and clutter you added.
- For risky changes (sign-in, secrets, payments, anything that runs commands), run a security
  review and fix what it finds.
- Keep screenshots, traces, logs, tokens and personal data out of the repo unless the repo says
  otherwise.
- Stop and report instead of improvising when the only way to pass is a shortcut, when you would
  need a real person's private data, or when the change breaks something you were told not to touch.
- Report in plain words:
  - each check marked PASS, FAIL, BLOCKED (could not run, and why) or NOT RUN
  - what changed, with the screenshots
  - which checks ran and what they showed
  - which services were faked and how (existing, ready-made, built)
  - what was not tested, and why
