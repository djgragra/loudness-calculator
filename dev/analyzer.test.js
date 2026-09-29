"use strict";
// Validation against EBU Tech 3341 (2023) Table 1 test signals, synthesised at 48 kHz.
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../analyzer.js");

const FS = 48000;
const amp = (db) => Math.pow(10, db / 20);

function tone(seconds, db, freq = 1000, fs = FS) {
  const n = Math.round(seconds * fs), x = new Float32Array(n), a = amp(db);
  for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * freq * i / fs);
  return x;
}
function concat(parts) {
  const n = parts.reduce((s, p) => s + p.length, 0), out = new Float32Array(n);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const near = (actual, expected, tol, label) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: got ${actual}, expected ${expected} ±${tol}`);

test("K-weighting at 48 kHz matches the published BS.1770 coefficients", () => {
  const k = A.kWeighting(48000);
  const ref = {
    sb: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    sa: [-1.69065929318241, 0.73248077421585],
    ha: [-1.99004745483398, 0.99007225036621]
  };
  ref.sb.forEach((v, i) => near(k.shelf.b[i], v, 1e-7, "shelf b" + i));
  near(k.shelf.a[1], ref.sa[0], 1e-7, "shelf a1"); near(k.shelf.a[2], ref.sa[1], 1e-7, "shelf a2");
  near(k.hp.a[1], ref.ha[0], 1e-7, "hp a1"); near(k.hp.a[2], ref.ha[1], 1e-7, "hp a2");
});

test("case 1-2: stereo 1 kHz sine, -23 / -33 dBFS -> -23.0 / -33.0 LUFS", () => {
  let r = A.analyze([tone(20, -23), tone(20, -23)], FS);
  near(r.integrated, -23.0, 0.1, "case 1");
  r = A.analyze([tone(20, -33), tone(20, -33)], FS);
  near(r.integrated, -33.0, 0.1, "case 2");
});

test("case 3: gating removes the -36 dBFS parts", () => {
  const ch = concat([tone(10, -36), tone(60, -23), tone(10, -36)]);
  near(A.analyze([ch, ch], FS).integrated, -23.0, 0.1, "case 3");
});

test("case 4: absolute (-72) and relative gating", () => {
  const ch = concat([tone(10, -72), tone(10, -36), tone(60, -23), tone(10, -36), tone(10, -72)]);
  near(A.analyze([ch, ch], FS).integrated, -23.0, 0.1, "case 4");
});

test("case 5: -26 / -20 / -26 dBFS -> -23.0 LUFS", () => {
  const ch = concat([tone(20, -26), tone(20.1, -20), tone(20, -26)]);
  near(A.analyze([ch, ch], FS).integrated, -23.0, 0.1, "case 5");
});

test("case 6: 5.0 channels (L R C Ls Rs) -> -23.0 LUFS; LFE ignored in 5.1", () => {
  const five = [tone(20, -28), tone(20, -28), tone(20, -24), tone(20, -30), tone(20, -30)];
  near(A.analyze(five, FS).integrated, -23.0, 0.1, "case 6 (5.0)");
  const six = [five[0], five[1], five[2], tone(20, 0), five[3], five[4]];   // loud LFE must not count
  near(A.analyze(six, FS).integrated, -23.0, 0.1, "case 6 (5.1, loud LFE)");
});

test("mono file is measured as one channel (-3.01 dB vs two identical channels)", () => {
  const st = A.analyze([tone(20, -23), tone(20, -23)], FS).integrated;
  const mo = A.analyze([tone(20, -23)], FS).integrated;
  near(st - mo, 3.01, 0.02, "stereo - mono");
});

test("silence and very short files give no loudness value", () => {
  assert.equal(A.analyze([new Float32Array(FS * 5)], FS).integrated, null);
  assert.equal(A.analyze([tone(0.3, -20)], FS).integrated, null);
  assert.equal(A.analyze([new Float32Array(FS * 5)], FS).truePeak, null);
});

function fadedSine(freq, ampl, phaseDeg, seconds = 1, fs = FS) {
  const n = Math.round(seconds * fs), x = new Float32Array(n), fade = Math.round(0.01 * fs);
  for (let i = 0; i < n; i++) {
    let g = 1; if (i < fade) g = i / fade; else if (i > n - fade) g = (n - i) / fade;
    x[i] = g * ampl * Math.sin(2 * Math.PI * freq * i / fs + phaseDeg * Math.PI / 180);
  }
  return x;
}
const dbtp = (x) => 20 * Math.log10(x);

test("cases 15-19: true peak of inter-sample peaks (+0.2/-0.4 dB tolerance)", () => {
  const cases = [
    ["15 fs/4 0.50 0deg",   FS / 4, 0.50, 0.0,  -6.0],
    ["16 fs/4 0.50 45deg",  FS / 4, 0.50, 45.0, -6.0],
    ["17 fs/6 0.50 60deg",  FS / 6, 0.50, 60.0, -6.0],
    ["18 fs/8 0.50 67.5deg", FS / 8, 0.50, 67.5, -6.0],
    ["19 fs/4 1.41 45deg",  FS / 4, 1.41, 45.0, +3.0]
  ];
  for (const [name, f, a, ph, expected] of cases) {
    const x = fadedSine(f, a, ph);
    const r = A.analyze([x, x], FS);
    assert.ok(r.truePeak >= expected - 0.4 && r.truePeak <= expected + 0.2, `${name}: true peak ${r.truePeak}`);
  }
  // and the sample peak alone would have underestimated case 16 by ~3 dB
  const x = fadedSine(FS / 4, 0.5, 45);
  assert.ok(A.analyze([x], FS).samplePeak < -8);
});

test("true-peak skip optimisation equals brute force on noise and music-like signals", () => {
  const n = FS * 3, x = new Float32Array(n);
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5;
  for (let i = 0; i < n; i++) x[i] = rnd() * 0.6 * Math.sin(i / 4000) + 0.3 * Math.sin(2 * Math.PI * 440 * i / FS) + 0.1 * rnd();
  const phases = A._buildPhases(4);
  const fast = A._peaks(x, 4, phases, 0).tp;
  // brute force: force the running peak to zero by evaluating every interval
  let best = 0;
  const M = 12;
  for (let i = 0; i < n - 1; i++) for (let p = 0; p < 3; p++) {
    let acc = 0; for (let m = -M + 1; m <= M; m++) { const k = i + m; if (k >= 0 && k < n) acc += x[k] * phases[p][m + M - 1]; }
    best = Math.max(best, Math.abs(acc));
  }
  best = Math.max(best, ...Array.from({ length: 1 }, () => A._peaks(x, 1, [], 0).sample));
  near(dbtp(fast), dbtp(best), 0.001, "fast vs brute force");
});

test("sample-rate sniffing: WAV, FLAC, Ogg Vorbis/Opus, MP3, MP4", () => {
  const bytes = (n) => new Uint8Array(n);
  const put = (b, o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  const le32 = (b, o, v) => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >> 24) & 255; };
  const be32 = (b, o, v) => { b[o + 3] = v & 255; b[o + 2] = (v >> 8) & 255; b[o + 1] = (v >> 16) & 255; b[o] = (v >> 24) & 255; };

  let b = bytes(64); put(b, 0, "RIFF"); put(b, 8, "WAVE"); put(b, 12, "fmt "); le32(b, 24, 44100);
  assert.equal(A.sniffSampleRate(b), 44100);

  b = bytes(64); put(b, 0, "fLaC"); const sr = 96000; b[18] = (sr >> 12) & 255; b[19] = (sr >> 4) & 255; b[20] = (sr & 15) << 4;
  assert.equal(A.sniffSampleRate(b), 96000);

  b = bytes(128); put(b, 0, "OggS"); put(b, 28, "\x01vorbis"); le32(b, 40, 44100);
  assert.equal(A.sniffSampleRate(b), 44100);
  b = bytes(128); put(b, 0, "OggS"); put(b, 28, "OpusHead");
  assert.equal(A.sniffSampleRate(b), 48000);

  b = bytes(64); b[0] = 0xFF; b[1] = 0xFB; b[2] = 0x90;            // MPEG1 layer3, 44.1 kHz
  assert.equal(A.sniffSampleRate(b), 44100);
  b = bytes(64); b[0] = 0xFF; b[1] = 0xF3; b[2] = 0x84;            // MPEG2 layer3, 24 kHz
  assert.equal(A.sniffSampleRate(b), 24000);

  b = bytes(128); put(b, 4, "ftyp"); put(b, 40, "mdhd"); be32(b, 56, 48000);   // v0: timescale at tag+16
  assert.equal(A.sniffSampleRate(b), 48000);
  assert.equal(A.sniffSampleRate(bytes(64)), null);
});
