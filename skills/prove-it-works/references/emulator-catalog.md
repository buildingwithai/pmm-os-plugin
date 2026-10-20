# Emulator catalog

Free ways to fake outside services, best first. Check what the repo already has before adding
anything new. Re-check versions and licenses when you install. This list goes stale, so search
when a service is missing (see "Research a fake" in `building-an-emulator.md`).

## Ready-made emulators

| Service | Fake | Notes |
|---|---|---|
| Vercel, GitHub, Google (OAuth, Gmail, Calendar, Drive), Slack, Apple, Microsoft, Okta, AWS, Resend, Stripe, MongoDB Atlas, Clerk, Linear, Twilio | `emulate` (emulate.dev, Vercel Labs, open source) | `npx emulate` starts all of them on ports 4000-4013. `--service github,slack` picks some. `--seed emulate.config.yaml` loads test data (`npx emulate init` writes a starter). In tests: `import { createEmulator } from "emulate"`, then `reset()` between tests. Point the SDK's base URL at `emulator.url`. |
| AWS (S3, SQS, DynamoDB, Lambda and more) | LocalStack | Docker. Wider AWS coverage than `emulate`. |
| S3-compatible storage (S3, R2) | MinIO | Docker. Real S3 API. |
| Azure storage | Azurite | Docker or npm. |
| Firebase (Auth, Firestore, Functions, Storage) | Firebase Local Emulator Suite | `firebase emulators:start`. |
| Supabase (Postgres, Auth, Storage) | `supabase start` | Docker. Full local stack. |
| Convex | `convex-test`, or `npx convex dev --local` | `convex-test` runs functions in-process for unit tests. |
| Stripe | `emulate --service stripe`, `stripe-mock`, or Stripe test mode | `stripe-mock` is Stripe's own stateless mock. Test mode hits the real API with fake money: use it for a final contract check. |
| Email | Mailpit | Docker. Local SMTP server with an inbox UI and an API to read sent mail in tests. |
| Postgres, MySQL, Redis, Kafka, and other servers | Testcontainers | Runs the real server in Docker per test run. PGlite runs Postgres in-process with no Docker. |

## Fakes you can generate from a spec

| Tool | Use it when |
|---|---|
| Prism (Stoplight) | The service publishes an OpenAPI spec. `npx @stoplight/prism-cli mock spec.yaml` serves a fake that answers in the spec's shapes. It is stateless: good for shapes, not for flows. |
| Mockoon | You want a fake with a UI, or import from OpenAPI. Has a CLI for CI. |
| WireMock | You need stubs, recording, and fault injection (timeouts, 500s). |

## Fakes inside the test process

| Tool | Use it when |
|---|---|
| MSW (Mock Service Worker) | Intercept `fetch` in browser or Node tests. Good for record-and-replay of LLM or API calls. |
| nock (Node), responses / VCR.py (Python), Polly.js | Record real responses once, replay them in every later run. |
| Playwright `page.route` | Fake one network call inside a browser test. |

## Drive the real UI

| Tool | Use it when |
|---|---|
| Playwright | Web and Electron. Screenshots with `page.screenshot({ fullPage: true })`. |
| Maestro | Mobile (iOS, Android) and some desktop flows. Takes screenshots in flows. |

## No fake needed

Analytics, error tracking, and logging (PostHog, Segment, Sentry): turn them off in tests with
an empty key or a no-op client behind an interface. Do not build an emulator for them.
