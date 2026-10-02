#!/usr/bin/env bash
# Run a turn in its own session so it outlives the caller's time limit.
#
#   scripts/agents/detach.sh <result-file> <command> [args...]
#
# Output goes to <result-file>; when the command ends, its exit code is written
# to <result-file>.done. Poll for that file to know the turn has finished.
set -euo pipefail
result="${1:?result file}"; shift
rm -f "$result" "$result.done"
python3 - "$result" "$@" <<'PY'
import os, subprocess, sys
result, cmd = sys.argv[1], sys.argv[2:]
if os.fork():
    sys.exit(0)
os.setsid()
if os.fork():
    os._exit(0)
with open(result, "w") as out:
    code = subprocess.call(cmd, stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
with open(result + ".done", "w") as done:
    done.write(str(code))
os._exit(0)
PY
echo "detached: $result"
