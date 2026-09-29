"use strict";
// Validate analyzer.js against the EBU loudness test set (Tech 3341 test cases with integrated
// loudness or true-peak expectations). The test set is NOT in this repo (EBU Terms of Use):
//   download ebu-loudness-test-setv05.zip from https://tech.ebu.ch/publications/ebu_loudness_test_set,
//   unzip it, then run:  node dev/validate-ebu.js /path/to/unzipped/folder
const fs = require("fs");
const path = require("path");
const { readWav } = require("./wav.js");
const A = require("../analyzer.js");

const dir = process.argv[2];
if (!dir) { console.error("usage: node dev/validate-ebu.js <folder with the EBU wav files>"); process.exit(2); }

// [file (prefix match), kind, expected, description]
const CASES = [
  ["seq-3341-1-16bit.wav", "I", -23.0, "1: 1 kHz sine -23 dBFS"],
  ["seq-3341-2-16bit.wav", "I", -33.0, "2: 1 kHz sine -33 dBFS"],
  ["seq-3341-3-16bit-v02.wav", "I", -23.0, "3: gating, -36/-23/-36"],
  ["seq-3341-4-16bit-v02.wav", "I", -23.0, "4: absolute + relative gate"],
  ["seq-3341-5-16bit-v02.wav", "I", -23.0, "5: -26/-20/-26"],
  ["seq-3341-6-5channels-16bit.wav", "I", -23.0, "6: 5.0 channels"],
  ["seq-3341-6-6channels-WAVEEX-16bit.wav", "I", -23.0, "6: 5.1 (silent LFE)"],
  ["seq-3341-7_seq-3342-5-24bit.wav", "I", -23.0, "7: authentic programme, narrow LRA"],
  ["seq-3341-2011-8_seq-3342-6-24bit-v02.wav", "I", -23.0, "8: authentic programme, wide LRA"],
  ["seq-3341-15-24bit.wav", "TP", -6.0, "15: fs/4, 0.50, 0 deg"],
  ["seq-3341-16-24bit.wav", "TP", -6.0, "16: fs/4, 0.50, 45 deg"],
  ["seq-3341-17-24bit.wav", "TP", -6.0, "17: fs/6, 0.50, 60 deg"],
  ["seq-3341-18-24bit.wav", "TP", -6.0, "18: fs/8, 0.50, 67.5 deg"],
  ["seq-3341-19-24bit.wav", "TP", 3.0, "19: fs/4, 1.41, 45 deg"],
  ["seq-3341-20-24bit.wav", "TP", 0.0, "20: inter-sample, offset 0"],
  ["seq-3341-21-24bit.wav", "TP", 0.0, "21: inter-sample, offset 1"],
  ["seq-3341-22-24bit.wav", "TP", 0.0, "22: inter-sample, offset 2"],
  ["seq-3341-23-24bit.wav", "TP", 0.0, "23: inter-sample, offset 3"]
];

const files = fs.readdirSync(dir);
let bad = 0;
for (const [name, kind, expected, label] of CASES) {
  const f = files.find((x) => x.startsWith(name.replace(/\.wav$/, "")));
  if (!f) { console.log("MISSING  ", label); bad++; continue; }
  const w = readWav(path.join(dir, f));
  const r = A.analyze(w.chans, w.fs);
  const got = kind === "I" ? r.integrated : r.truePeak;
  const lo = kind === "I" ? -0.1 : -0.4, hi = kind === "I" ? 0.1 : 0.2;   // Tech 3341 tolerances
  const diff = got - expected, ok = diff >= lo - 1e-9 && diff <= hi + 1e-9;
  if (!ok) bad++;
  console.log((ok ? "PASS " : "FAIL ") + label.padEnd(40) + " expected " + expected.toFixed(1).padStart(6) +
    "  got " + got.toFixed(2).padStart(7) + "  diff " + (diff >= 0 ? "+" : "") + diff.toFixed(2) + (kind === "I" ? " LU" : " dB"));
}
console.log(bad ? bad + " case(s) out of tolerance or missing" : "all cases within the Tech 3341 tolerances");
process.exit(bad ? 1 : 0);
