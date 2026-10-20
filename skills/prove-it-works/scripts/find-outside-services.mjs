#!/usr/bin/env node
// Lists the outside services a codebase talks to, and a suggested way to fake each one.
// Looks at dependencies (package.json, requirements.txt, pyproject.toml), env var names
// (.env.example and code), and hostnames in code. Zero dependencies. Read-only.
//
// Usage: node find-outside-services.mjs [repo-dir] [--json]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? ".";
const asJson = process.argv.includes("--json");

// key: service. match: dependency names, env var prefixes, and hostnames that point to it.
// fake: the first thing to try. Order inside each list is the order to try.
const SERVICES = [
  { key: "Stripe", deps: ["stripe", "@stripe/"], env: ["STRIPE_"], hosts: ["api.stripe.com"], fake: ["npx emulate --service stripe", "stripe-mock", "Stripe test mode keys"] },
  { key: "GitHub", deps: ["@octokit/", "octokit", "PyGithub"], env: ["GITHUB_", "GH_"], hosts: ["api.github.com"], fake: ["npx emulate --service github"] },
  { key: "Slack", deps: ["@slack/"], env: ["SLACK_"], hosts: ["slack.com/api"], fake: ["npx emulate --service slack"] },
  { key: "Google (OAuth, Gmail, Calendar, Drive)", deps: ["googleapis", "google-auth-library", "@googleapis/"], env: ["GOOGLE_", "GMAIL_"], hosts: ["googleapis.com", "accounts.google.com"], fake: ["npx emulate --service google"] },
  { key: "Microsoft (Entra, Graph)", deps: ["@azure/msal", "@microsoft/microsoft-graph-client"], env: ["AZURE_AD_", "MICROSOFT_", "MSAL_"], hosts: ["graph.microsoft.com", "login.microsoftonline.com"], fake: ["npx emulate --service microsoft"] },
  { key: "Apple sign-in", deps: ["apple-signin-auth"], env: ["APPLE_"], hosts: ["appleid.apple.com"], fake: ["npx emulate --service apple"] },
  { key: "Okta", deps: ["@okta/"], env: ["OKTA_"], hosts: ["okta.com"], fake: ["npx emulate --service okta"] },
  { key: "Resend", deps: ["resend"], env: ["RESEND_"], hosts: ["api.resend.com"], fake: ["npx emulate --service resend"] },
  { key: "Email over SMTP", deps: ["nodemailer"], env: ["SMTP_"], hosts: [], fake: ["Mailpit (local SMTP inbox)"] },
  { key: "Twilio", deps: ["twilio"], env: ["TWILIO_"], hosts: ["api.twilio.com"], fake: ["npx emulate --service twilio"] },
  { key: "Linear", deps: ["@linear/sdk"], env: ["LINEAR_"], hosts: ["api.linear.app"], fake: ["npx emulate --service linear"] },
  { key: "Clerk", deps: ["@clerk/"], env: ["CLERK_"], hosts: ["clerk.com", "clerk.accounts.dev"], fake: ["npx emulate --service clerk"] },
  { key: "Vercel API", deps: ["@vercel/sdk"], env: ["VERCEL_TOKEN"], hosts: ["api.vercel.com"], fake: ["npx emulate --service vercel"] },
  { key: "MongoDB", deps: ["mongodb", "mongoose", "pymongo"], env: ["MONGODB_", "MONGO_"], hosts: ["mongodb.net"], fake: ["Testcontainers mongo", "emulate (MongoDB Atlas admin API; see npx emulate list)"] },
  { key: "AWS", deps: ["@aws-sdk/", "aws-sdk", "boto3"], env: ["AWS_"], hosts: ["amazonaws.com"], fake: ["npx emulate --service aws", "LocalStack"] },
  { key: "S3-compatible storage", deps: [], env: ["S3_"], hosts: ["r2.cloudflarestorage.com"], fake: ["MinIO", "LocalStack"] },
  { key: "Azure storage", deps: ["@azure/storage-blob"], env: ["AZURE_STORAGE_"], hosts: ["blob.core.windows.net"], fake: ["Azurite"] },
  { key: "Firebase", deps: ["firebase", "firebase-admin"], env: ["FIREBASE_"], hosts: ["firebaseio.com", "firestore.googleapis.com"], fake: ["Firebase Local Emulator Suite"] },
  { key: "Supabase", deps: ["@supabase/"], env: ["SUPABASE_"], hosts: ["supabase.co"], fake: ["supabase start (local stack)"] },
  { key: "Postgres", deps: ["pg", "postgres", "@prisma/client", "psycopg", "psycopg2", "@neondatabase/serverless"], env: ["DATABASE_URL", "POSTGRES_", "PG"], hosts: ["neon.tech"], fake: ["Testcontainers postgres", "PGlite (in-process)"] },
  { key: "Redis", deps: ["redis", "ioredis", "@upstash/redis"], env: ["REDIS_", "UPSTASH_"], hosts: ["upstash.io"], fake: ["Testcontainers redis", "ioredis-mock"] },
  { key: "Convex", deps: ["convex"], env: ["CONVEX_"], hosts: ["convex.cloud"], fake: ["convex-test", "local Convex backend (npx convex dev --local)"] },
  { key: "OpenAI", deps: ["openai"], env: ["OPENAI_"], hosts: ["api.openai.com"], fake: ["build one: record-and-replay fixtures (MSW or Polly.js)", "a local model behind the same interface (Ollama)"] },
  { key: "Anthropic", deps: ["@anthropic-ai/sdk", "anthropic"], env: ["ANTHROPIC_"], hosts: ["api.anthropic.com"], fake: ["build one: record-and-replay fixtures (MSW or Polly.js)"] },
  { key: "OpenRouter", deps: ["@openrouter/"], env: ["OPENROUTER_"], hosts: ["openrouter.ai"], fake: ["build one: record-and-replay fixtures (MSW or Polly.js)", "a local model behind the same interface (Ollama)"] },
  { key: "Composio", deps: ["composio-core", "@composio/"], env: ["COMPOSIO_"], hosts: ["composio.dev"], fake: ["build one: npx emulate init --custom composio"] },
  { key: "Pipedream", deps: ["@pipedream/"], env: ["PIPEDREAM_"], hosts: ["pipedream.com"], fake: ["build one: npx emulate init --custom pipedream"] },
  { key: "E2B / Daytona sandboxes", deps: ["e2b", "@e2b/", "@daytonaio/"], env: ["E2B_", "DAYTONA_"], hosts: ["e2b.dev", "daytona.io"], fake: ["build one: a fake sandbox behind the sandbox interface"] },
  { key: "HubSpot", deps: ["@hubspot/"], env: ["HUBSPOT_"], hosts: ["api.hubapi.com"], fake: ["Prism mock from HubSpot's OpenAPI spec", "build one: npx emulate init --custom hubspot"] },
  { key: "Salesforce", deps: ["jsforce"], env: ["SALESFORCE_", "SF_"], hosts: ["salesforce.com"], fake: ["build one: npx emulate init --custom salesforce"] },
  { key: "Notion", deps: ["@notionhq/client"], env: ["NOTION_"], hosts: ["api.notion.com"], fake: ["build one: npx emulate init --custom notion"] },
  { key: "PostHog / analytics", deps: ["posthog-js", "posthog-node", "@segment/"], env: ["POSTHOG_", "SEGMENT_"], hosts: ["posthog.com"], fake: ["no-op client behind an interface"] },
  { key: "Sentry", deps: ["@sentry/"], env: ["SENTRY_"], hosts: ["sentry.io"], fake: ["no-op client (disable DSN in tests)"] },
];

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".venv", "venv", "__pycache__", "vendor", ".cache", "test-results", "playwright-report"]);
const CODE_EXT = /\.(m?[jt]sx?|cjs|py|go|rb|rs|java|kt|swift|php|cs)$/;
const MAX_FILE = 400_000;
const MAX_FILES = 20_000;

const found = new Map();
const hit = (svc, kind, detail, file) => {
  if (!found.has(svc.key)) found.set(svc.key, { service: svc.key, fake: svc.fake, evidence: [] });
  const ev = found.get(svc.key).evidence;
  if (ev.length < 6 && !ev.some((e) => e.detail === detail)) ev.push({ kind, detail, file: relative(root, file) || "." });
};

const files = [];
(function walk(dir) {
  if (files.length >= MAX_FILES) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name)); }
    else if (e.isFile()) files.push(join(dir, e.name));
  }
})(root);

const read = (f) => { try { return statSync(f).size > MAX_FILE ? "" : readFileSync(f, "utf8"); } catch { return ""; } };
const depMatches = (name, dep) => (dep.endsWith("/") ? name.startsWith(dep) : name === dep);

for (const f of files) {
  const name = basename(f);
  if (name === "package.json") {
    let pkg; try { pkg = JSON.parse(read(f)); } catch { continue; }
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies });
    for (const d of deps) for (const s of SERVICES) if (s.deps.some((x) => depMatches(d, x))) hit(s, "dependency", d, f);
  } else if (/^requirements.*\.txt$|^pyproject\.toml$/.test(name)) {
    const text = read(f).toLowerCase();
    for (const s of SERVICES) for (const d of s.deps) if (!d.includes("/") && new RegExp(`(^|[\\s"'])${d.toLowerCase()}([\\s=<>~!\\[";']|$)`, "m").test(text)) hit(s, "dependency", d, f);
  } else if (/^\.env(\..*)?\.(example|sample|template)$|^\.env\.example$/.test(name)) {
    for (const line of read(f).split("\n")) {
      const v = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]+)\s*=/)?.[1];
      if (v) for (const s of SERVICES) if (s.env.some((p) => v.startsWith(p))) hit(s, "env var", v, f);
    }
  } else if (CODE_EXT.test(name)) {
    const text = read(f);
    if (!text) continue;
    for (const s of SERVICES) {
      for (const h of s.hosts) if (text.includes(h)) hit(s, "hostname", h, f);
      for (const p of s.env) {
        const m = text.match(new RegExp(`(?:process\\.env\\.|os\\.environ(?:\\.get)?\\(?\\[?["']|getenv\\(["'])(${p}[A-Z0-9_]*)`));
        if (m) hit(s, "env var", m[1], f);
      }
    }
  }
}

// Hostnames we have no entry for: worth a look, they may be services to fake too.
const known = SERVICES.flatMap((s) => s.hosts);
const unknownHosts = new Map();
for (const f of files) {
  if (!CODE_EXT.test(f) || /\.(test|spec)\./.test(f)) continue;
  for (const m of read(f).matchAll(/https:\/\/(api\.[a-z0-9.-]+\.[a-z]{2,})/g)) {
    const h = m[1];
    if (/\.(test|example|local|invalid|localhost)$|(^|\.)example\.(com|org|net)$/.test(h)) continue;
    if (!known.some((k) => h.includes(k.split("/")[0])) && !unknownHosts.has(h)) unknownHosts.set(h, relative(root, f));
  }
}

const services = [...found.values()].sort((a, b) => a.service.localeCompare(b.service));
const other = [...unknownHosts].slice(0, 40).map(([host, file]) => ({ host, file }));

if (asJson) {
  console.log(JSON.stringify({ root, services, otherApiHosts: other }, null, 2));
} else {
  console.log(`Outside services found in ${root}: ${services.length}\n`);
  for (const s of services) {
    console.log(`- ${s.service}`);
    console.log(`    try first: ${s.fake.join("  |  then: ")}`);
    console.log(`    seen as:   ${s.evidence.map((e) => `${e.kind} ${e.detail} (${e.file})`).join("; ")}`);
  }
  if (other.length) {
    console.log(`\nOther API hosts in code (research a fake for each that tests touch):`);
    for (const o of other) console.log(`- ${o.host} (${o.file})`);
  }
  console.log(`\nBefore adding a fake, check the repo for one already (search: emulator, fake, mock, msw, nock).`);
}
