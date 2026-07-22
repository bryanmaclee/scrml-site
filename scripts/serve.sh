#!/usr/bin/env bash
# serve.sh — serve the scrml-site viewer with its precomputed flagship artifacts.
#
#   bash scripts/serve.sh [PORT]
#
# `scrml dev` serves the compiled OUTPUT dir (./dist). The flagship artifacts
# live in the SOURCE tree at ./data/ (so they are committed + reproducible). The
# dev server has no public/ asset convention, so this script symlinks
# dist/data -> ../data after the first compile, making /data/mario/* resolve via
# the same Bun.serve static fallback. The symlink survives recompiles (the
# watcher rewrites .scrml outputs only).
#
# scrml is a LINKED DEPENDENCY (bun link scrml) — the `scrml` binary comes from
# node_modules/.bin (the real adopter path), NOT a sibling compiler/src checkout.
# Run `bun link scrml` once if node_modules/.bin/scrml is missing.
#
# HISTORY (2026-06-02 → 2026-07-22): this script used to pass the app's .scrml
# files EXPLICITLY, because the then-linked compiler's directory scanner
# (api.js scanDirectory) recursively walked every subdir with no node_modules /
# symlink skip — so `scrml dev .` followed the linked-compiler symlink and tried
# to compile thousands of its stdlib/sample/example sources, never listening.
# We reported it; it is FIXED (scrml api.js scanDirectory now skips dot-entries
# + SCAN_SKIP_DIRS and uses lstatSync, so it never follows a bun-linked tree).
# The workaround is retired — directory mode is the canonical invocation again.
#
# FRICTION NOTE (still open): `scrml dev` does not serve a sibling static-asset
# dir. A `--static <dir>` flag (or a `public/` convention) would remove the
# dist/data symlink glue below.
set -euo pipefail
PORT="${1:-8787}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

SCRML="$ROOT/node_modules/.bin/scrml"
if [ ! -x "$SCRML" ]; then
  echo "[serve] node_modules/.bin/scrml missing — run 'bun link scrml' in this repo first" >&2
  exit 1
fi

# Ensure artifacts exist.
if [ ! -f "$ROOT/data/mario/manifest.json" ]; then
  echo "[serve] no artifacts — running build-artifacts.mjs first"
  bun run "$HERE/build-artifacts.mjs"
fi

# Pre-create dist + the data symlink so the very first request resolves.
mkdir -p "$ROOT/dist"
ln -sfn ../data "$ROOT/dist/data"

echo "[serve] scrml dev .  (port $PORT)  — /data/<flagship>/* via dist/data symlink"
exec "$SCRML" dev "$ROOT" --output "$ROOT/dist" --port "$PORT"
