#!/usr/bin/env bash
# flobase cross-pa-notify — UserPromptSubmit hook. Surfaces unread URGENT cross-PA inbox messages at the operator's
# next TURN-boundary (checkpoint-not-interrupt — never a mid-task interrupt; the same hazard the boot-atomicity rule
# guards). The turn-boundary layer atop the dropbox transport: session-start covers boot, the pre-commit inbox-surface
# covers commit-boundary, THIS covers the live turn. Closes the operator-as-courier loop between parallel PAs.
#
# Urgency gate = the EXISTING `needs:` field (no new mechanism): reply|action → inject; fyi → skip (it surfaces at the
# coarser boundaries). Blocking = `blocking: true` frontmatter → flagged ⛔ (the asker is waiting on a reply). Notes
# re-surface every turn until handled (read + `git mv` to read/) — the standing reminder a blocking ask needs.
# Claude Code injects this script's stdout into the PA's context on UserPromptSubmit. NEVER blocks (exit 0).
set -u
ROOT="${CLAUDE_PROJECT_DIR:-.}"
INBOX="$ROOT/handOffs/incoming"
[ -d "$INBOX" ] || exit 0

urgent=""
for f in "$INBOX"/*.md; do
  [ -e "$f" ] || continue                       # glob matched nothing (read/ is a subdir, excluded) → no urgent items
  needs=$(grep -m1 -iE '^needs:[[:space:]]' "$f" 2>/dev/null | sed -E 's/^[Nn]eeds:[[:space:]]*//')
  case "$needs" in
    *reply*|*action*) ;;                        # urgent → surface
    *) continue ;;                              # fyi / unset → not a push item
  esac
  from=$(grep -m1 -iE '^from:[[:space:]]'    "$f" 2>/dev/null | sed -E 's/^[Ff]rom:[[:space:]]*//')
  subj=$(grep -m1 -iE '^subject:[[:space:]]' "$f" 2>/dev/null | sed -E 's/^[Ss]ubject:[[:space:]]*//')
  block=""
  grep -qiE '^blocking:[[:space:]]*true' "$f" 2>/dev/null && block=" ⛔BLOCKING"
  urgent="${urgent}  • from ${from:-?}${block} · needs:${needs} — ${subj:-(no subject)}\n     → ${f#$ROOT/}\n"
done

if [ -n "$urgent" ]; then
  printf '📨 CROSS-PA INBOX — urgent unread message(s) at this turn-boundary (read, act, then `git mv` to read/):\n%b' "$urgent"
fi
exit 0
