"use strict";
// Cross-check analyzer.js against ffmpeg's ebur128 filter (an independent BS.1770 implementation).
//   node dev/crosscheck-ffmpeg.js file1.wav file2.wav ...
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const A = require("../analyzer.js");
const { readWav } = require("./wav.js");

for (const file of process.argv.slice(2)) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const out = r.stderr, sum = out.slice(out.lastIndexOf("Summary:"));
  const I = parseFloat(/I:\s+(-?[\d.]+) LUFS/.exec(sum)[1]);
  const P = parseFloat(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)[1]);
  const w = readWav(file), m = A.analyze(w.chans, w.fs);
  console.log(file.split("/").pop().padEnd(28), w.fs + " Hz",
    " I ffmpeg", I.toFixed(1).padStart(6), "ours", m.integrated.toFixed(2).padStart(7), "diff", (m.integrated - I >= 0 ? "+" : "") + (m.integrated - I).toFixed(2),
    "| TP ffmpeg", P.toFixed(1).padStart(6), "ours", m.truePeak.toFixed(2).padStart(7), "diff", (m.truePeak - P >= 0 ? "+" : "") + (m.truePeak - P).toFixed(2));
}
