#!/usr/bin/env bash
# Run one Codex turn for the orchestrator and keep its output out of the caller's context.
#
#   scripts/agents/codex-turn.sh new <prompt-file>
#   scripts/agents/codex-turn.sh resume <session-id> <prompt-file>
#
# Prints only: the session id, the exit code and the agent's final message.
# The full event stream goes to $CODEX_TURN_LOG_DIR (default: a temp directory).
set -uo pipefail

MODEL="${CODEX_TURN_MODEL:-gpt-6.1-sol}"
EFFORT="${CODEX_TURN_EFFORT:-high}"
LOG_DIR="${CODEX_TURN_LOG_DIR:-${TMPDIR:-/tmp}/codex-turns}"
mkdir -p "$LOG_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
log="$LOG_DIR/$stamp.jsonl"
last="$LOG_DIR/$stamp.last.md"

mode="${1:?new|resume}"
common=(-m "$MODEL" -c "model_reasoning_effort=\"$EFFORT\"" --approve-for-me --json -o "$last")

case "$mode" in
  new)
    prompt="${2:?prompt file}"
    codex exec "${common[@]}" - < "$prompt" > "$log" 2>&1
    ;;
  resume)
    session="${2:?session id}"
    prompt="${3:?prompt file}"
    codex exec resume "${common[@]}" "$session" - < "$prompt" > "$log" 2>&1
    ;;
  *)
    echo "usage: $0 new <prompt-file> | resume <session-id> <prompt-file>" >&2
    exit 2
    ;;
esac
status=$?

session_id="$(grep -o '"thread_id":"[^"]*"' "$log" | head -1 | cut -d'"' -f4)"
echo "session: ${session_id:-${session:-unknown}}"
echo "exit: $status"
echo "log: $log"
if grep -E "\"type\":\"(error|turn.failed)\"" "$log" | grep -qiE "usage limit|rate limit|quota"; then echo "LIMIT: an error event mentions a usage or rate limit"; fi
echo "--- final message ---"
if [ -s "$last" ]; then cat "$last"; else tail -c 2000 "$log"; fi
exit $status
