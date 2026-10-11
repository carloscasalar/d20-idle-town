#!/usr/bin/env bash
# Run one opencode turn (cheap-model tasks: reviews, checks) and keep its output
# out of the caller's context.
#
#   scripts/agents/opencode-turn.sh new <title> <prompt-file>
#   scripts/agents/opencode-turn.sh resume <session-id> <prompt-file>
#
# Prints only: the session id, the exit code and the agent's final message.
# The JSON event stream goes to $OPENCODE_TURN_LOG_DIR so progress can be inspected.
set -uo pipefail

MODEL="${OPENCODE_TURN_MODEL:-minimax/MiniMax-M3}"
VARIANT="${OPENCODE_TURN_VARIANT:-thinking}"
LOG_DIR="${OPENCODE_TURN_LOG_DIR:-${TMPDIR:-/tmp}/opencode-turns}"
mkdir -p "$LOG_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
out="$LOG_DIR/$stamp.jsonl"

mode="${1:?new|resume}"
case "$mode" in
  new)
    title="${2:?title}"; prompt="${3:?prompt file}"
    opencode run --auto --model "$MODEL" --variant "$VARIANT" --format json \
      --title "$title" "$(cat "$prompt")" > "$out" 2>&1
    ;;
  resume)
    session="${2:?session id}"; prompt="${3:?prompt file}"
    opencode run --auto --model "$MODEL" --variant "$VARIANT" --format json \
      --session "$session" "$(cat "$prompt")" > "$out" 2>&1
    ;;
  *)
    echo "usage: $0 new <title> <prompt-file> | resume <session-id> <prompt-file>" >&2
    exit 2
    ;;
esac
status=$?

python3 - "$out" "$status" <<'PY'
import json, sys
path, status = sys.argv[1], sys.argv[2]
session, texts = None, []
for line in open(path, errors="replace"):
    try:
        event = json.loads(line)
    except ValueError:
        continue
    session = session or event.get("sessionID") or (event.get("part") or {}).get("sessionID")
    part = event.get("part") or {}
    if part.get("type") == "text" and part.get("text"):
        texts.append(part["text"])
print(f"session: {session or 'unknown'}")
print(f"exit: {status}")
print(f"log: {path}")
print("--- final message ---")
print(texts[-1] if texts else open(path, errors="replace").read()[-3000:])
PY
exit $status
