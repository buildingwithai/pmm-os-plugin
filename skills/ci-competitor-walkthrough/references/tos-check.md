# Terms-of-service check

Run this per competitor, **before** opening its signup or sign-in page, and again whenever a
document's "last updated" date has changed or your recorded decision is more than 90 days old.
You are an AI agent operating a browser. Any clause about bots, automated means or agents
applies to you.

## 1. Find every binding document

Check all of these. A missing document is something to note, not permission.

- Footer links: Terms, Terms of Service, Terms of Use, Legal, Acceptable Use Policy (AUP), Customer Terms, Master Subscription Agreement (MSA), Subscription Agreement.
- Common paths: `/terms`, `/legal`, `/tos`, `/aup`, `/acceptable-use`, `/legal/terms`, `/legal/aup`, `/msa`.
- The **signup page clickwrap** ("By signing up you agree to …"). It may link a different version or extra documents, such as trial terms or product-specific terms.
- Product-specific terms for any feature you will test: AI or generative-AI terms, API or developer terms, beta or preview terms, marketplace or integration terms.
- Free-trial or self-serve terms, which are often stricter than the MSA (for example, "for internal evaluation only").

`robots.txt` governs crawlers and is not a contract. If it disallows the app paths **and** the
terms mention automated access, treat the case as `unclear`.

For each document, save a plain-text copy to
`.agents/research/walkthroughs/terms/<competitor>-<doc>-<yyyymmdd>.txt` and log its URL, the
document's "last updated" date, the UTC retrieval time and `sha256sum` of the saved copy.

## 2. Read in full, then search for these terms

Read the whole document first; clause headings mislead. Then search the text so nothing is
missed:

| Category | Search terms | Typical prohibitive shape |
|---|---|---|
| Competitor access / competitive use | `competitor`, `competitive`, `compete`, `competing`, `similar product`, `rival` | "You may not access the Service if you are a direct competitor, except with our prior written consent", or "…to build a competitive product or service" |
| Benchmarking / publication | `benchmark`, `performance test`, `comparative`, `publish`, `disclose … results` | "You will not publish or disclose the results of any benchmark or comparison" |
| Reverse engineering / copying | `reverse engineer`, `decompile`, `disassemble`, `derive source`, `copy … features, functions or graphics`, `frame`, `mirror` | "…copy any features, functions or graphics of the Service" |
| Automated access / agents | `bot`, `robot`, `spider`, `crawler`, `scraper`, `script`, `automated`, `automation`, `macro`, `headless`, `agent`, `AI agent`, `artificial intelligence` | "Accessing the Service by automated means, other than through our published API" |
| Account creation | `human`, `accurate`, `truthful`, `on behalf of`, `authority`, `one account`, `registration`, `business email` | "Accounts registered by bots or automated methods are not permitted" |
| Confidentiality / recording | `confidential`, `screenshot`, `record`, `capture`, `non-public` | "The Service, including its interfaces, is our Confidential Information" |
| Trial / evaluation scope | `evaluation`, `trial`, `internal business purposes`, `non-commercial` | "Free trials are for evaluating the Service for your own internal use" |
| Identity / misrepresentation | `impersonate`, `misrepresent`, `false information` | "Do not misrepresent your identity or affiliation" |

## 3. Decide

| Decision | When | Action |
|---|---|---|
| `clear` | You read every document and found nothing that restricts this research | Proceed to signup |
| `limits` | Testing is allowed but something constrains it, such as no publishing benchmarks, no screenshots outside your company, or internal evaluation only | **Ask the user.** Proceed only with the constraint written into the plan (for example, recordings stay inside PMM OS and are never published) |
| `unclear` | Ambiguous wording, a document you couldn't reach (blocked, geo-gated, login-only), or a conflict between documents | **Ask the user.** Don't proceed on your own reading |
| `prohibited` | An explicit ban on competitor access or competitive use, on automated or agent access to the app, or on account creation by bots or agents | **Stop and ask.** Recommend not testing. Proceed only if the user provides the vendor's written permission or confirms explicit legal sign-off. If only the automation clause applies, you may offer: "you drive the product by hand while I record and annotate". |

Never resolve doubt by guessing in favor of testing. Never sign up "to see the full terms": read
them before the account exists.

## 4. Ask the user (message template)

> **Terms check: <Competitor>** (<decision>)
> I read: <doc title> (<url>, last updated <date>), and <…>.
> Clause that matters, <doc> §<n>: "<verbatim text>"
> Why it matters: <one line, e.g. "bans access by direct competitors without written consent; PMM OS is a direct competitor">.
> Options: (a) skip hands-on testing and record public claims only; (b) proceed under <constraint>; (c) proceed with vendor permission or legal sign-off you provide.
> I recommend (<a/b>). Which do you choose?

Wait for an explicit answer. Log who answered, what they chose and when.

## 5. Record the decision

**Run log** (`## Terms decision`):

```markdown
- Decision: prohibited → user chose (a) skip hands-on, 2026-10-19T15:02Z (answered by <name>)
- Read: Terms of Service, https://example.com/legal/terms, updated 2026-06-01, retrieved 2026-10-19T14:40Z, sha256 <…>
- Read: Acceptable Use Policy, https://example.com/legal/aup, updated 2025-11-12, retrieved 2026-10-19T14:42Z, sha256 <…>
- Clause: ToS §4.2 "You may not access the Services if you are a direct competitor of Example…" (competitor access)
```

**Assignment checkpoint**, when you hold one (`checkpoint_job`):

```json
{"id": "job-acme-sso-20261019", "state": "accepted", "blocker": "",
 "text": "Terms check: clear. ToS https://acme.example/terms (updated 2026-06-01) and AUP https://acme.example/aup (updated 2025-11-12) read 2026-10-19T14:40Z; no competitor, benchmarking, reverse-engineering or automation clause.",
 "operationKey": "ckpt:job-acme-sso-20261019:terms"}
```

If testing stops on terms, use `"state": "blocked"` with `"blocker": "Terms: ToS §4.2 bans access by direct competitors; awaiting user decision"`.

**Observation**, when the result is "don't test" (one per scenario in scope):

```json
{"id": "obs-acme-sso-20261019-tos", "competitorId": "acme", "scenarioId": "sso-okta-admin",
 "title": "Acme SSO: not tested (terms decision)",
 "actual": "Not tested. Acme ToS §4.2 prohibits access by direct competitors without written consent; the user chose not to test hands-on.",
 "limitations": "This is a terms decision, not evidence about the feature. Public claims are recorded separately.",
 "outcome": "not_tested", "capturedAt": null,
 "sourceLabel": "Acme Terms of Service §4.2 (read 2026-10-19)",
 "sourceUrl": "https://acme.example/terms",
 "operationKey": "obs:obs-acme-sso-20261019-tos"}
```

## Never, whatever the terms say

- Bypass CAPTCHAs, bot detection, rate limits, paywalls, geo-blocks or email-domain checks.
- Spoof identity: no fake names, personas, disposable or alias emails created to hide affiliation, user-agent or fingerprint spoofing, stealth plugins, or VPNs used to evade a restriction.
- Misstate who you are or why you're there when the product asks.
- Create a second account after the first one was refused or its trial ended.
- Accept new or changed terms on the user's behalf without the user seeing them.
