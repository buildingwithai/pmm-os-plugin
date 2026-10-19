#!/usr/bin/env python3
"""Self-check for the Stop-hook receipt cross-check (Ring 4).

This is the last thing standing between a degraded run and a turn that describes
it as complete. It must block on a fact and stay out of the way otherwise — a
Stop hook that fires on ordinary work is a plugin people uninstall.

Run:  python3 hooks/test_stop_receipt_gate.py
"""
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOOK = Path(__file__).parent / "stop_quality_gate.py"
RECEIPT = Path.home() / ".pmm-os" / "last-receipt.json"


def receipt(verdict, minutes_ago=1, **extra):
    at = (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()
    return {"verdict": verdict, "at": at, "total": 63,
            "silentZero": ["grounding"], "notLive": [
                {"name": "tiktok", "state": "blocked", "reason": "http-402",
                 "fix": "Top up SCRAPECREATORS_API_KEY"}], **extra}


def run(message, rec, before=()):
    saved = RECEIPT.read_text() if RECEIPT.exists() else None
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    try:
        if rec is None:
            RECEIPT.unlink(missing_ok=True)
        else:
            RECEIPT.write_text(json.dumps(rec))
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as fh:
            for entry in before:
                fh.write(json.dumps(entry) + "\n")
            fh.write(json.dumps({"type": "assistant",
                                 "message": {"content": [{"type": "text", "text": message}]}}))
            tpath = fh.name
        p = subprocess.run(
            [sys.executable, str(HOOK)],
            input=json.dumps({"hook_event_name": "Stop", "transcript_path": tpath}),
            capture_output=True, text=True,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        os.unlink(tpath)
        assert p.returncode == 0, f"hook exited {p.returncode}: {p.stderr}"
        return json.loads(p.stdout) if p.stdout.strip() else {}
    finally:
        if saved is not None:
            RECEIPT.write_text(saved)
        elif RECEIPT.exists():
            RECEIPT.unlink()


CLAIM = "Research complete. I searched across 8 sources. " + "x" * 600
PLAIN = "I renamed the function and updated its three callers."

CASES = [
    ("claims research + DEGRADED receipt", CLAIM, receipt("DEGRADED"), True),
    ("claims research + THIN receipt", CLAIM, receipt("THIN"), True),
    ("claims research + NO-PLAN receipt", CLAIM, receipt("NO-PLAN"), True),
    ("claims research + CLEAN receipt", CLAIM, receipt("CLEAN"), False),
    ("claims research + no receipt at all", CLAIM, None, False),
    # A receipt from hours ago must not block unrelated later work.
    ("claims research + stale receipt", CLAIM, receipt("DEGRADED", minutes_ago=180), False),
    # The gate must be invisible to everything that isn't a research claim.
    ("ordinary answer + DEGRADED receipt", PLAIN, receipt("DEGRADED"), False),
    ("code change + DEGRADED receipt", "Fixed the off-by-one in parse().", receipt("DEGRADED"), False),
]

# The walkthrough skill reports what it recorded. The marketing-field QA must not make it
# pad that report with positioning or proof it never observed; other answers keep the QA.
WALKTHROUGH_REPORT = ("Recorded the PitchMeAI observation, uploaded the original clip and drafted a "
                      "battlecard proposal for the competitor. A human reviewer must approve it.")
SKILL_CALL = {"type": "assistant", "message": {"content": [
    {"type": "tool_use", "id": "t1", "name": "Skill",
     "input": {"skill": "pmm-os:ci-competitor-walkthrough"}}]}}
TOPIC_CASES = [
    ("walkthrough report after the skill loaded", WALKTHROUGH_REPORT, (SKILL_CALL,), False),
    ("same report without the skill", WALKTHROUGH_REPORT, (), True),
]


def main() -> int:
    failures = []
    cases = [(label, msg, rec, (), block) for label, msg, rec, block in CASES]
    cases += [(label, msg, None, before, block) for label, msg, before, block in TOPIC_CASES]
    for label, msg, rec, before, should_block in cases:
        out = run(msg, rec, before)
        blocked = out.get("decision") == "block"
        if blocked != should_block:
            failures.append(f"  {label}: expected {'BLOCK' if should_block else 'allow'}, "
                            f"got {'BLOCK' if blocked else 'allow'}")

    # The block must be actionable, not just a refusal.
    reason = run(CLAIM, receipt("DEGRADED")).get("reason", "")
    for must in ("DEGRADED", "silent zeros", "not queried", "fix:", "state the"):
        if must not in reason:
            failures.append(f"  block reason missing {must!r}")

    if failures:
        print(f"✗ {len(failures)} failed:")
        print("\n".join(failures))
        return 1
    print(f"✓ all {len(cases)} Stop-gate cases pass, and the block is actionable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
