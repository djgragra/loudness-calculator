"use strict";
// Minimal WAV reader for the validation scripts (PCM 16/24/32-bit, any channel count).
const fs = require("fs");

function readWav(file) {
  const b = fs.readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === "fmt ") fmt = { tag: b.readUInt16LE(o + 8), ch: b.readUInt16LE(o + 10), fs: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    else if (id === "data") { data = b.subarray(o + 8, o + 8 + Math.min(size, b.length - o - 8)); break; }
    o += 8 + size + (size & 1);
  }
  const bytes = fmt.bits / 8, frames = Math.floor(data.length / (bytes * fmt.ch));
  const chans = Array.from({ length: fmt.ch }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < fmt.ch; c++) {
    const p = (i * fmt.ch + c) * bytes;
    chans[c][i] = bytes === 2 ? data.readInt16LE(p) / 32768 : bytes === 3 ? (data.readIntLE(p, 3)) / 8388608 : data.readInt32LE(p) / 2147483648;
  }
  return { chans, fs: fmt.fs };
}

module.exports = { readWav };
