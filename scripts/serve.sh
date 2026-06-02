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
# scrmlTS is a LINKED DEPENDENCY (bun link scrmlts) — the `scrml` binary comes
# from node_modules/.bin (the real adopter path), NOT a sibling compiler/src
# checkout. Run `bun link scrmlts` once if node_modules/.bin/scrml is missing.
#
# WHY explicit file args (not `scrml dev .`): the compiler's directory scanner
# (api.js scanDirectory) recursively walks EVERY subdir with no node_modules /
# symlink skip — and `node_modules/scrmlts` is a symlink to the whole sibling
# scrmlTS repo. `scrml dev .` therefore tries to compile thousands of scrmlTS
# stdlib/sample/example sources and never starts listening. Passing the app's
# own .scrml files explicitly yields the SAME inputFiles set as directory mode
# would (data/ + dist/ carry no .scrml), minus the node_modules pollution.
# Reported to scrmlTS PA as a scanDirectory friction bug (2026-06-02).
#
# FRICTION NOTE (logged): `scrml dev` does not serve a sibling static-asset dir.
# A `--static <dir>` flag (or a `public/` convention) would remove this glue.
set -euo pipefail
PORT="${1:-8787}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

SCRML="$ROOT/node_modules/.bin/scrml"
if [ ! -x "$SCRML" ]; then
  echo "[serve] node_modules/.bin/scrml missing — run 'bun link scrmlts' in this repo first" >&2
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

# Gather the app's own .scrml sources explicitly (see WHY above). The set +
# common-prefix (repo root) match what `scrml dev .` would gather sans node_modules.
APP_SRCS=( "$ROOT/app.scrml" "$ROOT"/pages/*.scrml "$ROOT"/components/*.scrml "$ROOT"/lib/*.scrml )

echo "[serve] scrml dev (${#APP_SRCS[@]} app sources)  (port $PORT)  — /data/mario/* via dist/data symlink"
exec "$SCRML" dev "${APP_SRCS[@]}" --output "$ROOT/dist" --port "$PORT"
