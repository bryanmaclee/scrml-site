// video/measure.mjs — derive per-beat timecodes from a script's actual word count.
//
//     node video/measure.mjs video/ep01-three-booleans.md          # report
//     node video/measure.mjs video/ep01-three-booleans.md --write  # rewrite headings
//
// WHY THIS EXISTS: the first draft of ep01 carried a hand-estimated runtime of
// "6:00-6:30". Measured, it was 4:55 — wrong by 90 seconds, with every beat
// timecode wrong downstream of it. Estimating narration length by eye does not
// work. Re-run this after editing any beat.
//
// Narration = blockquote lines (`> `) inside the `## Script` section. Frame
// directions, production notes and code frames are excluded.
import { readFileSync, writeFileSync } from "node:fs";

const WPM = 170;                 // No Boilerplate register; ~170 is measured-typical
const PAUSE_DEFAULT = 2;         // seconds of frame beat per section
const PAUSE = {                  // per-beat overrides where the frame does work
  "cold open": 3, "the count": 6, "the turn": 3, "the transitions": 5,
  "the arithmetic": 4, "the timing problem": 4, "cross-field": 4,
  "the chain is gone": 3, "the landing": 2, "cta": 0,
};

const path = process.argv[2];
const write = process.argv.includes("--write");
if (!path) { console.error("usage: node video/measure.mjs <script.md> [--write]"); process.exit(2); }

const src = readFileSync(path, "utf8");
const head = src.split("## Script")[0];
const body = src.split("## Script")[1]?.split("## Code frames")[0];
if (!body) { console.error("no '## Script' … '## Code frames' section found"); process.exit(2); }

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const sections = body.split(/^### /m).slice(1);

let t = 0;
const beats = [];
for (const sec of sections) {
  const heading = sec.split("\n")[0];
  const title = heading.replace(/^\[\d+:\d+\]\s*/, "").replace(/\s*—.*$/, "").trim();
  const words = sec.split("\n")
    .filter((l) => l.trim().startsWith("> ") && !l.includes("PLACEHOLDER"))
    .join(" ").replace(/[>`⟨⟩*_]/g, " ")
    .split(/\s+/).filter(Boolean).length;
  const key = Object.keys(PAUSE).find((k) => title.toLowerCase().includes(k));
  const dur = (words / WPM) * 60 + (key ? PAUSE[key] : PAUSE_DEFAULT);
  beats.push({ start: t, heading, title, words, dur });
  t += dur;
}

for (const b of beats) {
  console.log(`  ${fmt(b.start).padStart(5)}  ${String(b.words).padStart(4)}w  ${String(Math.round(b.dur)).padStart(3)}s  ${b.title}`);
}
const total = beats.reduce((a, b) => a + b.words, 0);
console.log(`\n  narration ${total}w @ ${WPM}wpm = ${fmt((total / WPM) * 60)} speech`);
console.log(`  RUNTIME  ${fmt(t)}  (incl. ${Math.round(t - (total / WPM) * 60)}s frame beats)`);

if (write) {
  let out = src;
  for (const b of beats) {
    const fixed = b.heading.replace(/^\[\d+:\d+\]/, `[${fmt(b.start)}]`);
    if (!/^\[\d+:\d+\]/.test(b.heading)) continue;      // leave untimed headings alone
    out = out.replace(`### ${b.heading}\n`, `### ${fixed}\n`);
  }
  writeFileSync(path, out);
  console.log(`\n  wrote corrected timecodes to ${path}`);
}
