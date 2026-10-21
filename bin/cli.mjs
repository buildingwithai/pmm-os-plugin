#!/usr/bin/env node
/**
 * pmm-os — installer CLI for the PMM OS Claude Code plugin.
 *
 *   npx pmm-os install     copy the plugin payload to ~/.pmm-os/plugin and register
 *                          it with Claude Code (marketplace add + plugin install)
 *   npx pmm-os update      refresh the payload + marketplace, reinstall
 *   npx pmm-os uninstall   remove the plugin, the marketplace, and the payload
 *   npx pmm-os doctor      check node / claude CLI / payload / research engines
 *                          (--deep additionally runs verify-research.sh --smoke)
 *
 * Why copy out of node_modules: `npx` caches are ephemeral and prunable, while the
 * Claude Code marketplace needs a stable local path. ~/.pmm-os/plugin is that path.
 * Registration goes through the official CLI (`claude plugin ...`) — writing into
 * ~/.claude/plugins directly is unsupported.
 */
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();
const PAYLOAD = join(HOME, '.pmm-os', 'plugin');
const MARKETPLACE = 'pmm-os';
const PLUGIN = 'pmm-os@pmm-os';
const IS_WIN = process.platform === 'win32';

const log = (s) => console.log(s);
const ok = (s) => console.log('  ✓ ' + s);
const warn = (s) => console.log('  ! ' + s);
const fail = (s) => { console.error('  ✗ ' + s); };

function claude(args, opts = {}) {
  return spawnSync('claude', args, { encoding: 'utf8', shell: IS_WIN, ...opts });
}
function hasClaude() {
  const r = claude(['--version']);
  return r.status === 0 ? r.stdout.trim() : null;
}
// Skipped by FIRST PATH SEGMENT, not by substring match anywhere in the path.
// The old filter tested the whole absolute path against /node_modules|.../, so
// under npx — where PKG_ROOT is always inside a node_modules directory — it
// rejected its own source root and cpSync copied nothing. Silently. Every
// published version shipped that way.
const SKIP_TOP_LEVEL = new Set(['node_modules', 'bin', '.git', '.github', 'demo', 'website']);

function copyPayload() {
  mkdirSync(dirname(PAYLOAD), { recursive: true });
  rmSync(PAYLOAD, { recursive: true, force: true });
  cpSync(PKG_ROOT, PAYLOAD, {
    recursive: true,
    filter: (src) => src === PKG_ROOT || !SKIP_TOP_LEVEL.has(relative(PKG_ROOT, src).split(sep)[0])
  });
  // Never let a caller past this point believing a copy happened — update()
  // rmSync's the old payload first, so a silent no-op there is destructive.
  if (!existsSync(join(PAYLOAD, '.claude-plugin', 'plugin.json'))) {
    throw new Error(`payload copy produced nothing from ${PKG_ROOT} — refusing to continue`);
  }
  ok('payload → ' + PAYLOAD);
}
function manualSteps() {
  log('\nManual install (run these in a terminal or Claude Code):');
  log('  claude plugin marketplace add ' + PAYLOAD);
  log('  claude plugin install ' + PLUGIN);
  log('Then restart Claude Code (or run /reload-plugins).');
}

function install() {
  log('\nPMM OS — installing\n');
  copyPayload();
  if (!hasClaude()) {
    warn('`claude` CLI not found on PATH — payload staged, registration skipped.');
    manualSteps();
    process.exitCode = 1;
    return;
  }
  let r = claude(['plugin', 'marketplace', 'add', PAYLOAD]);
  if (r.status !== 0 && /already|exists/i.test((r.stderr || '') + (r.stdout || ''))) {
    r = claude(['plugin', 'marketplace', 'update', MARKETPLACE]);
  }
  if (r.status !== 0) { fail('marketplace registration failed: ' + (r.stderr || r.stdout || '').trim()); manualSteps(); process.exitCode = 1; return; }
  ok('marketplace registered (' + MARKETPLACE + ')');
  r = claude(['plugin', 'install', PLUGIN]);
  if (r.status !== 0 && !/already/i.test((r.stderr || '') + (r.stdout || ''))) {
    fail('plugin install failed: ' + (r.stderr || r.stdout || '').trim()); manualSteps(); process.exitCode = 1; return;
  }
  ok('plugin installed (' + PLUGIN + ')');
  log('\nDone. Restart Claude Code (or run /reload-plugins).');
  log('\n`last30days` research works with no setup (Reddit/HN/Polymarket/GitHub).');
  log('For the full sweep — video transcripts, web reading, more platforms:');
  log('  npx pmm-os setup');
  log('\nStart with: "take <your product> to market" — or any PMM request.');
}

function update() {
  log('\nPMM OS — updating\n');
  copyPayload();
  if (!hasClaude()) { warn('`claude` CLI not found — payload refreshed only.'); manualSteps(); return; }
  let r = claude(['plugin', 'marketplace', 'update', MARKETPLACE]);
  if (r.status !== 0) { r = claude(['plugin', 'marketplace', 'add', PAYLOAD]); }
  if (r.status === 0) ok('marketplace refreshed'); else warn('marketplace refresh failed — try: claude plugin marketplace add ' + PAYLOAD);
  r = claude(['plugin', 'install', PLUGIN]);
  if (r.status !== 0 && !/already/i.test((r.stderr || '') + (r.stdout || ''))) {
    fail('plugin reinstall failed: ' + (r.stderr || r.stdout || '').trim());
    manualSteps();
    process.exitCode = 1;
    return;
  }
  ok('plugin reinstalled at v' + requireVersion());
  log('\nRestart Claude Code (or /reload-plugins) to pick up the update.');
}

function uninstall() {
  log('\nPMM OS — uninstalling\n');
  if (hasClaude()) {
    claude(['plugin', 'uninstall', PLUGIN]);
    ok('plugin uninstalled');
    claude(['plugin', 'marketplace', 'remove', MARKETPLACE]);
    ok('marketplace removed');
  } else {
    warn('`claude` CLI not found — remove the plugin from Claude Code manually (/plugin).');
  }
  rmSync(PAYLOAD, { recursive: true, force: true });
  ok('payload removed (' + PAYLOAD + ')');

  // Uninstall used to leave the gateway token sitting in the engine's env file.
  // A credential should not outlive the thing that issued it.
  if (existsSync(L30_ENV)) {
    try {
      const kept = readEnvFile(L30_ENV).filter(
        (l) => !GATEWAY_KEYS.some((k) => l.startsWith(k + '='))
      );
      const body = kept.join('\n').trim();
      if (body) { writeFileSync(L30_ENV, body + '\n'); ok('PMM OS token removed from ' + L30_ENV); }
      else { rmSync(L30_ENV, { force: true }); ok('removed ' + L30_ENV); }
    } catch { warn('could not clean ' + L30_ENV + ' — delete it by hand'); }
  }

  log('\nStill on disk (delete for a full wipe):');
  log('  ' + join(HOME, '.pmm-os') + '   setup marker and logs');
  log('  ' + L30_CONFIG_DIR + '   research-engine config');
  log('Packages installed by `npx pmm-os setup` (curl_cffi, instaloader, TikTokApi,');
  log('browser_cookie3, playwright webkit) are left alone — other tools may use them.');
}

function setup() {
  log('\nPMM OS — research engine setup\n');
  log('`last30days` already works with no setup: Reddit, Hacker News, Polymarket, GitHub.');
  log('This step adds `agent-reach` for video transcripts, web reading, and more platforms.\n');
  log('It will, on this machine:');
  log('  • pip/pipx install: curl_cffi, instaloader, TikTokApi, browser_cookie3');
  log('  • download a headless WebKit browser via playwright (a few hundred MB)');
  log('  • add a line to ~/.config/yt-dlp/config\n');
  const script = [join(PAYLOAD, 'skills', 'agent-reach', 'scripts', 'setup.sh'),
                  join(PKG_ROOT, 'skills', 'agent-reach', 'scripts', 'setup.sh')].find(existsSync);
  if (!script) { fail('setup.sh not found — run `npx pmm-os install` first.'); process.exitCode = 1; return; }
  if (!process.argv.includes('--yes')) {
    log('Re-run with --yes to proceed:');
    log('  npx pmm-os setup --yes');
    return;
  }
  const r = spawnSync('bash', [script, '--no-social-wire'], { stdio: 'inherit', shell: false });
  if (r.status === 0) {
    mkdirSync(join(HOME, '.pmm-os'), { recursive: true });
    writeFileSync(join(HOME, '.pmm-os', 'research-setup'), 'installed\n');
    ok('research engines installed');
    log('\nOptional — wire your already-logged-in X / Instagram / TikTok sessions (no passwords):');
    log('  bash ' + join(dirname(script), 'reach.sh') + ' social-setup');
  } else {
    fail('setup failed — see the output above');
  }
  process.exitCode = r.status ?? 1;
}

function requireVersion() {
  try {
    return JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version;
  } catch { return 'unknown'; }
}

async function doctor() {
  log('\nPMM OS — doctor\n');
  const major = Number(process.versions.node.split('.')[0]);
  major >= 18 ? ok('node ' + process.versions.node) : fail('node ' + process.versions.node + ' (need >= 18)');
  const cv = hasClaude();
  cv ? ok('claude CLI: ' + cv) : fail('claude CLI not found on PATH — install Claude Code first: https://claude.com/claude-code');
  existsSync(PAYLOAD) ? ok('payload present: ' + PAYLOAD) : warn('payload not staged — run: npx pmm-os install');
  const { resolvePython } = await import('./lib/resolve-python.mjs');
  const pyr = resolvePython();
  if (pyr.error) warn('python: ' + pyr.error.split('\n')[0]);
  else { ok(`python: ${pyr.version} (${pyr.lane})`); if (pyr.warning) warn(pyr.warning); }
  const marker = join(HOME, '.pmm-os', 'research-setup');
  existsSync(marker) ? ok('research engines: set up') : warn('research engines: not set up — last30days works anyway; run `npx pmm-os setup` for the rest');
  const verify = [join(PAYLOAD, 'scripts', 'verify-research.sh'), join(PKG_ROOT, 'scripts', 'verify-research.sh')].find(existsSync);
  if (!process.argv.includes('--deep')) {
    log('\nDeep health check (live keyless engine calls): npx pmm-os doctor --deep');
    return;
  }
  if (!verify) { fail('verify-research.sh not found — run: npx pmm-os install'); process.exitCode = 1; return; }
  if (IS_WIN && spawnSync('bash', ['--version'], { encoding: 'utf8', shell: true }).status !== 0) {
    warn('--deep needs bash (Git Bash / WSL on Windows)'); process.exitCode = 1; return;
  }
  log('\nDeep health check — real keyless engine calls (~30–60s)\n');
  const r = spawnSync('bash', [verify, '--smoke'], { stdio: 'inherit', shell: false });
  process.exitCode = r.status ?? 1;
}

// --- research gateway client wiring ---
// Points the vendored engine's rerank at PMM OS (<app>/api/research/rerank), so
// the LLM judge runs on the person's agent model there, WITHOUT a provider key
// on this computer. We reuse the engine's redirectable provider slot: set the
// personal PMM OS key + gateway URL in the engine's own config
// (~/.config/last30days/.env).
const L30_CONFIG_DIR = join(HOME, '.config', 'last30days');
const L30_ENV = join(L30_CONFIG_DIR, '.env');
const GATEWAY_KEYS = ['LAST30DAYS_REASONING_PROVIDER', 'XAI_API_KEY', 'XAI_BASE_URL'];

function readEnvFile(p) {
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n');
}
function writeEnvKeys(lines, updates) {
  const keys = new Set(Object.keys(updates));
  const kept = lines.filter((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=/);
    return !(m && keys.has(m[1]));
  });
  for (const [k, v] of Object.entries(updates)) if (v !== null) kept.push(`${k}=${v}`);
  return kept.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').replace(/\n+$/, '') + '\n';
}

function researchConnect() {
  const url = process.argv[3];
  const token = process.argv[4];
  if (!url || !token) {
    log('\nUsage: npx pmm-os research-connect <pmm-os-address>/api/research/rerank <key>');
    log('  Copy the exact command from PMM OS: Settings > Plugin.');
    log('\nThe key is your personal PMM OS key. Ranking runs on your agent\'s model in PMM OS,');
    log('so no AI key is kept on this computer.');
    process.exitCode = 1;
    return;
  }
  mkdirSync(L30_CONFIG_DIR, { recursive: true });
  const merged = writeEnvKeys(readEnvFile(L30_ENV), {
    LAST30DAYS_REASONING_PROVIDER: 'xai', // redirectable, key-only-gated slot; the gateway forces the real cheap model
    XAI_API_KEY: token,
    XAI_BASE_URL: url,
  });
  writeFileSync(L30_ENV, merged, { mode: 0o600 });
  try { spawnSync('chmod', ['600', L30_ENV]); } catch { /* best effort */ }
  log('\nPMM OS — Research Intelligence connected');
  ok('gateway: ' + url);
  ok('config:  ' + L30_ENV + ' (chmod 600)');
  log('\nThe engine now rescoring-ranks candidates via the gateway (Pro). Verify: npx pmm-os doctor --deep');
}

function researchDisconnect() {
  if (!existsSync(L30_ENV)) { log('\nNothing to disconnect (no engine config).'); return; }
  writeFileSync(L30_ENV, writeEnvKeys(readEnvFile(L30_ENV), Object.fromEntries(GATEWAY_KEYS.map((k) => [k, null]))), { mode: 0o600 });
  log('\nPMM OS — Research Intelligence disconnected (back to local heuristic ranking).');
}


// --- sync: send the current engagement to PMM OS (<app>/api/cloud/sync) ---
// Reads what the plugin already produces in CWD: kit-content.json (the kit),
// report.json (typed evidence, if present), .agents/research/runs (run meta).
// Nothing fuzzy is parsed; structured files only.
async function cloudSync() {
  const url = process.argv[3];
  const token = process.argv[4];
  if (!url || !token) {
    log('\nUsage: npx pmm-os sync <pmm-os-address> <key>   (run from the engagement folder)');
    log('  Copy the exact command from PMM OS: Settings > Plugin.');
    process.exitCode = 1;
    return;
  }
  const cwd = process.cwd();
  const read = (f) => { try { return readFileSync(join(cwd, f), 'utf8'); } catch { return null; } };

  const kitRaw = read('kit-content.json');
  const kit = kitRaw ? JSON.parse(kitRaw) : null;
  const product = kit?.meta?.title?.split('—')[0]?.trim() || kit?.meta?.wordmark || null;
  if (!product) { fail('no kit-content.json with meta.title found in ' + cwd); process.exitCode = 1; return; }

  // evidence from report.json (the structured research contract), if present
  let evidence = [];
  const reportRaw = read('report.json') || read('.agents/research/report.json');
  if (reportRaw) {
    try {
      const report = JSON.parse(reportRaw);
      for (const desk of report.desks || []) {
        for (const finding of desk.findings || []) {
          for (const e of finding.evidence || []) {
            if (e?.q) evidence.push({
              quote: e.q, who: e.who, source: e.src, url: e.url,
              capturedAt: e.date, claimType: e.claimType, desk: desk.id || desk.name,
              screenshotUrl: e.shot,
            });
          }
        }
      }
    } catch { warn('report.json unreadable — syncing without evidence'); }
  }

  // run meta from the runs dir
  let engineCalls = null;
  try {
    const { readdirSync } = await import('node:fs');
    engineCalls = readdirSync(join(cwd, '.agents/research/runs')).filter((f) => f.endsWith('.md')).length;
  } catch { /* no runs dir — fine */ }

  const body = {
    product,
    run: { label: 'sync ' + new Date().toISOString().slice(0, 10), ranAt: new Date().toISOString(), engineCalls },
    evidence,
    kitContent: kit,
  };
  log('\nPMM OS — syncing "' + product + '" (' + evidence.length + ' evidence records' + (kit ? ', kit' : '') + ')');
  const endpoint = url.replace(/\/$/, '') + '/api/cloud/sync';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      fail('sync failed (' + res.status + '): ' + (data.error || 'unknown') + (data.fix ? ' — ' + data.fix : ''));
      process.exitCode = 1;
      return;
    }
    ok('synced — kit v' + data.kitVersion + ', ' + data.evidenceStored + ' evidence records stored');
    log(data.page?.title
      ? 'Open PMM OS: the kit is the page "' + data.page.title + '" in your workspace.'
      : 'Open it in PMM OS once you sign in.');
  } catch (err) {
    fail('could not reach ' + endpoint + ' — ' + (err?.message || err));
    process.exitCode = 1;
  }
}

const cmd = process.argv[2] || 'help';
if (cmd === 'install') install();
else if (cmd === 'update') update();
else if (cmd === 'uninstall') uninstall();
else if (cmd === 'setup') setup();
else if (cmd === 'connect') {
  const { connect } = await import('./lib/connect.mjs');
  process.exitCode = await connect({
    repoRoot: PKG_ROOT,
    json: process.argv.includes('--json'),
  });
}
else if (cmd === 'doctor') await doctor();
else if (cmd === 'sync') await cloudSync();
else if (cmd === 'research-connect') researchConnect();
else if (cmd === 'research-disconnect') researchDisconnect();
else {
  log('\npmm-os — Product Marketing OS for Claude Code');
  log('\nUsage:');
  log('  npx pmm-os install     install the plugin into Claude Code');
  log('  npx pmm-os update      update to this package’s version');
  log('  npx pmm-os uninstall   remove plugin + marketplace + payload');
  log('  npx pmm-os setup       opt-in install of the full research engine stack');
  log('  npx pmm-os connect     connect + VERIFY your research sources (--json for machines)');
  log('  npx pmm-os doctor      environment + research-engine health (--deep = live smoke test)');
  log('  npx pmm-os sync <url> <key>                 send this launch kit and its evidence to PMM OS');
  log('  npx pmm-os research-connect <url> <key>     rank research with your PMM OS agent\'s model');
  log('  npx pmm-os research-disconnect              revert to local heuristic ranking');
  log('\nDocs: https://github.com/buildingwithai/pmm-os');
}
