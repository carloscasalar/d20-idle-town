#!/usr/bin/env bash
# Run one Cursor agent turn for the orchestrator and keep its output out of the caller's context.
# Fallback implementer for when Codex is out of quota; same contract as codex-turn.sh.
#
#   scripts/agents/cursor-turn.sh new <prompt-file>
#   scripts/agents/cursor-turn.sh resume <session-id> <prompt-file>
#
# Prints only: the session id, the exit code and the agent's final message.
set -uo pipefail

MODEL="${CURSOR_TURN_MODEL:-grok-4.7-high}"
LOG_DIR="${CURSOR_TURN_LOG_DIR:-${TMPDIR:-/tmp}/cursor-turns}"
mkdir -p "$LOG_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
out="$LOG_DIR/$stamp.out.md"

mode="${1:?new|resume}"
case "$mode" in
  new)
    prompt="${2:?prompt file}"
    session="$(cursor-agent create-chat)" || { echo "could not create a Cursor chat" >&2; exit 1; }
    ;;
  resume)
    session="${2:?session id}"
    prompt="${3:?prompt file}"
    ;;
  *)
    echo "usage: $0 new <prompt-file> | resume <session-id> <prompt-file>" >&2
    exit 2
    ;;
esac

cursor-agent -p --trust --force --output-format text \
  --resume "$session" --model "$MODEL" "$(cat "$prompt")" > "$out" 2>&1
status=$?

echo "session: $session"
echo "exit: $status"
echo "log: $out"
if [ "$status" -ne 0 ] && grep -qiE 'usage limit|rate limit|quota' "$out"; then echo "LIMIT: the output mentions a usage or rate limit"; fi
echo "--- final message ---"
tail -c 4000 "$out"
exit $status
