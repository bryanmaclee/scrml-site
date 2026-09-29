# s441-site-fix progress

Compiler under test: scrml origin/main cf62b41 (0.8.0) + tag v0.8.0 (8cd1e02) + build pin 50478f0e.

- [x] 1 landing pages — v0.8.0, real <title>s, footer install, getting-started commands, runtime + auth honesty
- [x] 2 samples compile or carry a visible data-sample label; audit-samples.mjs is a CI gate (bite proven)
- [x] 3 stale content — E-MULTI-STATEMENT-HANDLER, E-SQL-006, E-CHANNEL-INSIDE-PAGE, retired codes, npm-myth, dashboard stub
- [x] 4 article correction notes (7 articles) + Living Compiler links -> retraction
- [x] 5 links — scrmlTS -> scrml, SPEC anchors -> SPEC-INDEX, giti.dev -> repo
- [x] 6 showcase — inline block handler, defer, keyed <each>, formFor, value-native map
- [x] 7 pin — KEPT at 50478f0e (current main breaks /showcase gold-verify 9/11); samples gated at v0.8.0
- [x] dark-theme fix: bold + inline code were slate-900 on the dark page (layered override lost)

Final: build (pin) 0, wiki 7/7, gold 11/11, all JS node --check, samples GREEN at v0.8.0 and cf62b41.
