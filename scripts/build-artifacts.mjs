#!/usr/bin/env bun
// build-artifacts.mjs — reproducible precompute of the C1 self-demo viewer's
// flagship artifacts. Increment 1 ships ONE flagship (mario).
//
// WHY a script (not `scrml compile --sourceMap`): the CLI `compile` command
// does NOT expose a --sourceMap flag (verified compile.js arg-parse, S151).
// `sourceMap` is a compileScrml() API option (api.js:543, default false). So
// the documented, honest precompute path is to drive the public compileScrml
// API directly. This is NOT a JS hack hiding a compiler gap — it is the same
// API the CLI itself calls; the only missing glue is a CLI flag (logged as a
// friction bug-candidate). The engine-graph JSON likewise comes from the
// public `engineGraphJson()` lazy accessor on the compile result.
//
// Single-file compile ON PURPOSE: the engine-graph multi-file write-loop bug
// (hand-off-155 line 37) only mis-writes when many inputs compile together;
// compiling mario alone yields a correct mario.engine-graph.json.
//
// Regenerate:  bun run scripts/build-artifacts.mjs   (or scripts/build-artifacts.sh)
//
// scrml is consumed as a LINKED DEPENDENCY (bun link scrml), not a vendored copy
// — so the compiler API and the test-asset `examples/` both resolve through the
// `scrml` package, into the sibling scrml repo. This is the real adopter path.
// (S154 extraction: was ../../../compiler when nested inside the compiler repo.)
//
// 2026-07-22: REWIRED from the retired `scrmlts` package (sibling scrmlTS, last
// commit 2026-06-07 / S172) to the live `scrml` (v0.7.1 / S279). The artifacts
// under data/ had been precompiled by a compiler ~107 sessions behind.
import { compileScrml } from "scrml/compiler/src/api.js";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FLAGSHIPS = [
  {
    id: "mario",
    title: "Super Mario State Machine",
    // resolved through the scrml package → sibling scrml/examples/ (test asset)
    source: "scrml/examples/14-mario-state-machine.scrml",
    // base name the compiler derives from the source file (basename w/o ext)
    base: "14-mario-state-machine",
  },
  {
    id: "triage",
    title: "Triage Board",
    // the other engine-heavy corpus example (DragPhase: Idle <-> Dragging).
    // Single-file, compiles standalone — same precompute path as mario.
    source: "scrml/examples/25-triage-board.scrml",
    base: "25-triage-board",
  },
];

for (const f of FLAGSHIPS) {
  const srcAbs = fileURLToPath(import.meta.resolve(f.source));
  const outDir = join(__dirname, "..", "data", f.id);
  mkdirSync(outDir, { recursive: true });

  console.log(`[build-artifacts] compiling ${f.source} -> data/${f.id}/ (sourceMap + engineGraph)`);

  const result = compileScrml({
    inputFiles: [srcAbs],
    sourceMap: true,
    write: true,
    outputDir: outDir,
  });

  if (result.errors && result.errors.length) {
    console.error(`[build-artifacts] FAIL — ${result.errors.length} compile error(s):`);
    for (const e of result.errors) console.error("  ", e.code || "", e.message || JSON.stringify(e));
    process.exit(1);
  }

  // engine-graph JSON via the public lazy accessor (all-files graph; correct
  // for a single-file compile).
  const egJson = typeof result.engineGraphJson === "function"
    ? result.engineGraphJson()
    : (result.engineGraphJson || JSON.stringify({ engines: [] }));
  const egPath = join(outDir, `${f.id}.engine-graph.json`);
  writeFileSync(egPath, typeof egJson === "string" ? egJson : JSON.stringify(egJson, null, 2));

  // Copy the verbatim source text (sourcesContent is NOT embedded in the map
  // by default, so the viewer ships the .scrml source itself).
  copyFileSync(srcAbs, join(outDir, "source.scrml.txt"));

  // The compiler writes <base>.client.js, <base>.client.js.map, <base>.html,
  // <base>.css using the SOURCE basename. We expose stable per-flagship names
  // in the manifest so the viewer never hard-codes the example number.
  const manifest = {
    title: f.title,
    flagship: f.id,
    // the original example filename (for the honest "Source — <file>.scrml" label)
    sourceFile: `${f.base}.scrml`,
    source: "source.scrml.txt",
    clientJs: `${f.base}.client.js`,
    jsMap: `${f.base}.client.js.map`,
    html: `${f.base}.html`,
    css: `${f.base}.css`,
    engineGraph: `${f.id}.engine-graph.json`,
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`[build-artifacts] OK — wrote data/${f.id}/ (manifest + engine-graph + source + compiler outputs)`);
}
