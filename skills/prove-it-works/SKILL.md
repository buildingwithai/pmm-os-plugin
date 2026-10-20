---
name: prove-it-works
description: Prove that code you build or change actually works, with real test runs, emulators for outside services, and screenshots, before calling it done. Use when building or fixing an app, prototype, landing page, launch-kit app, or integration (for example output from prd-prototype-factory or pmm-launch-kit). Skip it for pure writing work like battlecards or messaging.
---

# Prove It Works

A claim that something works is worth nothing without proof. This skill is how an agent earns trust: it shows the run, the result, and the screen.

## When to use it, and when not to

Use it when the work is code that people will run or see: an app, a prototype, a site, a launch-kit app, an MCP tool, an integration.

Use judgment. Scale the proof to the risk:
- A typo, a copy edit, or a one-line config change: run the fast checks and stop.
- No test setup exists and the user wants a quick throwaway prototype: take a screenshot and say tests were skipped.
- The user says to skip tests: skip them and say so.
- An emulator does not fit (for example the point is to check the live service, or a fake would cost more than the feature): test the real thing safely with test data, or say what was not tested.

## 1. Plan first (for anything bigger than a small fix)

- Write a short checklist before code. For each item, write how it will be proven: which test, which screen, which screenshot.
- Keep working until every box is checked. Do not stop at the first green step.

## 2. Read the repo's rules

- Read `AGENTS.md` and `CLAUDE.md` at the repo root and in the folder you change. Follow them.
- Use the repo's own test, typecheck and lint commands (package.json, Makefile, CONTRIBUTING.md).

## 3. Test outside services with emulators when it makes sense

- An emulator is a local fake that answers like the real API and keeps its state in memory. Tests then give a real pass or fail with no keys, accounts or cost.
- First look for emulators already in the repo (search for `emulator`, `fake`, `mock`).
- For GitHub, Slack, Stripe, Resend, Gmail and similar, `npx emulate` (emulate.dev, free and open source) runs local fakes. For AWS, use LocalStack.
- If a service you depend on has no emulator and you will test it more than once, build a small one: copy the real request and response shapes, keep state in memory, and add it in the same change.

## 4. Prove it with a real run

- Run the tests, typecheck and lint. For a bug, reproduce it first, then show the same check passing.
- For a screen you add or change, open it in a browser test (Playwright for web, Maestro for mobile or desktop) and save a screenshot. If no test opens that screen yet, add one when the project has a test setup.
- Look at the screenshots yourself. Check the change is visible and nothing nearby broke.
- A passing build, a mock, or "it should work" is not proof. If you could not run something, say so plainly and why.

## 5. Before calling it done

- Re-read your own diff as a reviewer would. Remove extra explainer text and clutter you added.
- For risky changes (sign-in, secrets, payments, anything that runs commands), run a security review and fix what it finds.
- In your report, attach the screenshots and list the checks that ran and their results, in plain words.
