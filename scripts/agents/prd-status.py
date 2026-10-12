#!/usr/bin/env python3
"""Show where a PRD's implementation stands and which issue to take next.

    scripts/agents/prd-status.py .scratch/<feature-slug>

Reads `issues/*.md` under the PRD folder. An issue is *workable* when its
`Status:` is `ready-for-agent` and every issue named on its `Blocked-by:` line
is `done`. Prints one line per issue and then the workable issues in order.
Exit code: 0 when something is workable; 3 when nothing is left to do; 4 when
nothing is workable but work remains: issues blocked by an issue that is not
done, or issues parked as `needs-info`.
"""
import re
import sys
from pathlib import Path


def field(text, name):
    match = re.search(rf"^{name}:\s*(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    folder = Path(sys.argv[1]) / "issues"
    files = sorted(folder.glob("*.md"))
    if not files:
        sys.exit(f"no issues under {folder}")

    issues = {}
    for path in files:
        text = path.read_text()
        blockers = re.findall(r"\]\(([^)]+\.md)\)", field(text, "Blocked-by"))
        issues[path.name] = {"status": field(text, "Status"), "blockers": [Path(b).name for b in blockers]}

    workable, waiting = [], []
    parked = [name for name, issue in issues.items() if issue["status"] == "needs-info"]
    for name, issue in issues.items():
        open_blockers = [b for b in issue["blockers"] if issues.get(b, {}).get("status") != "done"]
        note = f"  blocked by {', '.join(open_blockers)}" if open_blockers else ""
        print(f"{issue['status'] or 'no-status':16} {name}{note}")
        if issue["status"] == "ready-for-agent":
            (waiting if open_blockers else workable).append(name)

    print()
    if workable and parked:
        print("parked (needs-info): " + ", ".join(parked))
    if workable:
        print("workable: " + ", ".join(workable))
        print(f"next: {workable[0]}")
        sys.exit(0)
    if parked:
        print("parked (needs-info): " + ", ".join(parked))
    if waiting:
        print("nothing workable: " + ", ".join(waiting) + " wait on issues that are not done")
    if waiting or parked:
        sys.exit(4)
    print("nothing left that is ready-for-agent")
    sys.exit(3)


if __name__ == "__main__":
    main()
