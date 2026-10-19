#!/usr/bin/env python3
"""Light final QA for marketing deliverables."""

from __future__ import annotations

import time
import json
from datetime import datetime
import os
import re
from _common import read_event

# Hard research gate (research-first): a strategy deliverable may not ship until the
# research that must feed it exists in the evidence ledger. (msg_pattern, required
# ledger sections, desk name to run.)
LEDGER_PATH = os.path.join(".agents", "research", "evidence.md")
RESEARCH_GATE = [
    # A launch/GTM is the high bar: it requires the COMPREHENSIVE research sweep, not a slice.
    (r"\b(go-to-market|go to market|gtm plan|launch plan|rollout plan|launch brief)\b",
     ["## pains", "## competitive", "## market", "## channels", "## events", "## gtm"],
     "the full sweep — run pmm-research-brief (all 10 desks)"),
    (r"\b(positioning statement|message house|messaging house)\b", ["## pains", "## competitive", "## market"], "customer + competitive + market"),
    (r"\b(pricing tier|packaging tier|price tier|pricing recommendation|tier strategy)\b", ["## proof", "## competitive"], "pricing + competitive"),
    (r"\b(conference|sponsorship|field marketing|events desk|event target|booth)\b", ["## events"], "events"),
]
PROCEED_WITHOUT = re.compile(r"\b(without research|skip (the )?research|no research|proceed anyway|already (did|have|ran) (the )?research|don'?t research|ignore (the )?research)\b", re.I)


def _ledger_text() -> "str | None":
    try:
        with open(LEDGER_PATH, encoding="utf-8") as fh:
            return fh.read().lower()
    except OSError:
        return None


REQUIRED_BY_TOPIC = [
    (r"\b(launch|gtm|go-to-market|rollout)\b", ["audience", "owner", "timeline", "launch tier", "metric"]),
    (r"\b(campaign brief|campaign plan|creative brief)\b", ["objective", "audience", "insight", "smp", "channel", "metric", "raci"]),
    (r"\b(positioning|messaging|value prop|message house)\b", ["audience", "pain", "claim", "proof", "differentiator"]),
    (r"\b(pricing|packaging|tier|sku)\b", ["value metric", "segment", "package", "risk", "measurement"]),
    (r"\b(competitive|battlecard|competitor)\b", ["competitor", "positioning", "proof", "objection", "source"]),
    (r"\b(account research|icp scoring|target account|outreach)\b", ["fit", "signal", "why now", "next action", "source"]),
    (r"\b(value map|technical marketing|metadata|on-page seo|editing code|osp)\b", ["audience", "claim", "value", "proof", "metadata"]),
    (r"\b(cro|experiment|a/b|ab test)\b", ["hypothesis", "metric", "baseline", "variant", "decision rule"]),
    (r"\b(artifact|deliverable|asset pack|slides|docx|pptx|social posts|image prompts)\b", ["format", "audience", "purpose", "owner", "review"]),
    (r"\b(plg|activation|aha moment|growth loop|pql|pqa|retention|expansion)\b", ["segment", "metric", "baseline", "experiment", "decision rule"]),
    (r"\b(prd|requirements|prototype|roadmap|product lifecycle)\b", ["user", "problem", "scope", "acceptance criteria", "metric"]),
    (r"\b(post-launch|retrospective|impact analysis|feedback synthesis|iteration)\b", ["baseline", "target", "actual", "learning", "next action"]),
]

COACH_TRIGGERS = r"\b(feedback|critique|review|pressure test|improve|coach|stakeholder|leadership|exec|sales team|customer-facing)\b"


def _last_message_from_transcript(event: dict) -> str:
    """Fall back to the transcript when the payload has no last_assistant_message.

    Older clients send only `last_assistant_message_id`, so every check here
    silently no-opped. Reading the transcript makes the behavior the same on
    both payload shapes instead of depending on the client version.
    """
    path = event.get("transcript_path")
    if not path:
        return ""
    try:
        with open(path, encoding="utf-8") as fh:
            lines = fh.readlines()
    except OSError:
        return ""
    for line in reversed(lines[-400:]):
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if entry.get("type") != "assistant":
            continue
        content = (entry.get("message") or {}).get("content") or []
        text = "".join(c.get("text", "") for c in content if isinstance(c, dict))
        if text.strip():
            return text
    return ""


def _walkthrough_run(event: dict) -> bool:
    """True when this session loaded the ci-competitor-walkthrough skill.

    That skill records evidence and reports what ran, in its own report format.
    Its reports name competitors and a human reviewer, so the marketing-field and
    coach checks below would push it to add positioning or proof it never observed,
    which its own rules forbid.
    """
    path = event.get("transcript_path")
    if not path:
        return False
    try:
        with open(path, encoding="utf-8") as fh:
            lines = fh.readlines()
    except OSError:
        return False
    for line in lines:
        if "ci-competitor-walkthrough" not in line:
            continue
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        content = (entry.get("message") or {}).get("content") or []
        for c in content if isinstance(content, list) else []:
            if (
                isinstance(c, dict)
                and c.get("type") == "tool_use"
                and c.get("name") == "Skill"
                and str((c.get("input") or {}).get("skill", "")).endswith("ci-competitor-walkthrough")
            ):
                return True
    return False


RESEARCH_CLAIM = re.compile(
    r"research (?:complete|done|finished)|Research quality|"
    r"sources?\s*(?:searched|queried|covered)|"
    r"(?:^|\n)\s*[✓✅]\s*\w+.*\bsources?\b|"
    r"across \d+ sources|\bVoC\b|voice[- ]of[- ]customer",
    re.I | re.M,
)


def _receipt_conflict(message: str) -> str | None:
    """Block when the turn reports research that the receipt says was degraded.

    The other gate in this file is advisory on purpose — refusing to finish
    someone's first launch request is how a plugin gets uninstalled. This one is
    different in kind: that gate makes a JUDGEMENT about whether enough research
    was done; this one states a FACT about whether the run that just happened was
    degraded. Blocking on a fact is defensible.

    It exists because the engine exits 0 on every degraded run and can print
    "Research quality: 5/5 core sources" while four sources returned nothing —
    so a model summarising its own run has no honest signal unless it reads the
    receipt, and nothing made it.
    """
    if not RESEARCH_CLAIM.search(message):
        return None
    path = os.path.expanduser("~/.pmm-os/last-receipt.json")
    try:
        with open(path, encoding="utf-8") as fh:
            r = json.load(fh)
    except (OSError, ValueError):
        return None
    if r.get("verdict") in (None, "CLEAN"):
        return None
    # Only this turn's run. A stale receipt must not block unrelated work.
    try:
        age = time.time() - datetime.fromisoformat(
            r["at"].replace("Z", "+00:00")).timestamp()
    except Exception:
        return None
    if age > 3600:
        return None

    silent = ", ".join(r.get("silentZero") or []) or "none"
    notlive = ", ".join(n.get("name", "?") for n in (r.get("notLive") or [])) or "none"
    fix = next((n.get("fix") for n in (r.get("notLive") or []) if n.get("fix")), None)
    return (
        "STOP: the research run you are describing was not clean.\n\n"
        f"  verdict:      {r['verdict']}\n"
        f"  returned:     {r.get('total', '?')} items\n"
        f"  silent zeros: {silent}   (requested, returned nothing)\n"
        f"  not queried:  {notlive}\n"
        + (f"  fix:          {fix}\n" if fix else "")
        + "\nDo not present this as complete coverage. Revise your answer to state the\n"
        "gap and its cause in the body — not a footnote — then stop. If the gap is\n"
        "acceptable for this task, say why explicitly."
    )


def main() -> None:
    event = read_event()
    if event.get("stop_hook_active"):
        return
    message = str(event.get("last_assistant_message") or "") or _last_message_from_transcript(event)

    conflict = _receipt_conflict(message)
    if conflict:
        print(json.dumps({"decision": "block", "reason": conflict}))
        return
    prompt = str(event.get("prompt") or event.get("last_user_message") or "")
    lower = message.lower()
    combined = (prompt + "\n" + message).lower()
    if not lower.strip():
        return

    # Hard research gate first: don't let a substantial strategy deliverable ship
    # ungrounded. Fires only on produced deliverables, and only when the ledger is
    # absent or missing the section that must feed them.
    if len(message) > 500 and not PROCEED_WITHOUT.search(prompt):
        ledger = _ledger_text()
        for pattern, sections, desk in RESEARCH_GATE:
            if re.search(pattern, lower):
                missing = [s for s in sections if ledger is None or s not in ledger]
                if missing:
                    where = "does not exist" if ledger is None else ("has no " + ", ".join(missing))
                    # Advisory, not a block. Refusing to finish someone's first
                    # "help me launch my product" because they haven't run a
                    # ten-desk research sweep yet is how a plugin gets uninstalled.
                    # Say the deliverable is ungrounded; let them decide.
                    print(json.dumps({
                        "systemMessage": (
                            "PMM OS: this deliverable isn't grounded in research yet — "
                            "`.agents/research/evidence.md` " + where + ". Run `pmm-research-desk` (" + desk + ") "
                            "to fan the specialist question set across last30days + agent-reach, capture sourced "
                            "evidence into the ledger, then regenerate this grounded and cited. "
                            "Strategy built on guesses reads confident and is still wrong."
                        ),
                    }))
                    return
                break

    if _walkthrough_run(event):
        return

    if re.search(COACH_TRIGGERS, combined) and "pmm coach" not in lower and "coach review" not in lower:
        print(json.dumps({
            "decision": "block",
            "reason": "Run one more PMM Coach pass. The user asked for feedback, improvement, stakeholder readiness, or a high-stakes review. Add a short coach review with top gaps and top revisions, then stop."
        }))
        return

    for pattern, required in REQUIRED_BY_TOPIC:
        if re.search(pattern, lower):
            missing = [term for term in required if term not in lower]
            if len(missing) >= 3:
                print(json.dumps({
                    "decision": "block",
                    "reason": "Run one more PMM OS QA pass. The answer appears to be a marketing deliverable but is missing several concrete fields: " + ", ".join(missing) + ". Add them, and make every section substantive — specific (named examples, segments, numbers), reasoned (the why and the trade-off), and evidenced (a proof or source per claim) — not a one-line label. Depth, not padding. Do not invent facts."
                }))
            return


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass          # a hook crash must never block the user
    raise SystemExit(0)
