"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../calc.js");
const S = require("../standards.js");

test("parseNumber handles comma, unicode minus, spaces and junk", () => {
  assert.equal(C.parseNumber("-23.5"), -23.5);
  assert.equal(C.parseNumber("−23,5"), -23.5);
  assert.equal(C.parseNumber("  -14 "), -14);
  assert.equal(C.parseNumber(""), null);
  assert.equal(C.parseNumber("abc"), null);
  assert.equal(C.parseNumber("-"), null);
  assert.equal(C.parseNumber("1e3"), null);
  assert.equal(C.parseNumber("--3"), null);
});

test("gain = target - input, result hits the target", () => {
  const r = C.compute({ input: -18.4, target: -23, tp: null, tpLimit: -1, tolerance: 1 });
  assert.ok(Math.abs(r.gain - -4.6) < 1e-9);
  assert.ok(Math.abs(r.resultLufs - -23) < 1e-9);
  assert.equal(r.resultTp, null);
  assert.equal(r.tpChecked, false);
});

test("true peak shifts by the same gain and is checked against the limit", () => {
  const ok = C.compute({ input: -20, target: -23, tp: -3, tpLimit: -1, tolerance: null });
  assert.equal(ok.resultTp, -6);
  assert.equal(ok.tpOver, false);

  const over = C.compute({ input: -20, target: -14, tp: -3, tpLimit: -1, tolerance: null });
  assert.equal(over.resultTp, 3);
  assert.equal(over.tpOver, true);
  assert.ok(Math.abs(over.overBy - 4) < 1e-9);
  assert.equal(over.maxSafeGain, 2);
  assert.equal(over.maxSafeLufs, -18);
});

test("true peak exactly at the limit is not an overshoot", () => {
  const r = C.compute({ input: -20, target: -14, tp: -7, tpLimit: -1, tolerance: null });
  assert.equal(r.tpOver, false);
  const r2 = C.compute({ input: -20.04, target: -14, tp: -7.04, tpLimit: -1, tolerance: null });
  assert.equal(r2.tpOver, false);
});

test("no limit or no measured peak means no check", () => {
  assert.equal(C.compute({ input: -20, target: -14, tp: -3, tpLimit: null, tolerance: null }).tpChecked, false);
  assert.equal(C.compute({ input: -20, target: -14, tp: null, tpLimit: -1, tolerance: null }).tpChecked, false);
});

test("tolerance window is inclusive", () => {
  const t = (input, tol) => C.compute({ input, target: -23, tp: null, tpLimit: null, tolerance: tol }).withinTolerance;
  assert.equal(t(-22, 1), true);
  assert.equal(t(-24, 1), true);
  assert.equal(t(-22.04, 1), true);
  assert.equal(t(-24.2, 1), false);
  assert.equal(t(-21.9, 1), false);
  assert.equal(t(-23, null), false);
});

test("playback: down-only never raises", () => {
  assert.equal(C.playbackGain("down", -20, -14, -3).gain, 0);
  assert.equal(C.playbackGain("down", -10, -14, null).gain, -4);
});

test("playback: up&down raises but respects headroom", () => {
  assert.equal(C.playbackGain("updown", -10, -14, null).gain, -4);
  const free = C.playbackGain("updown", -20, -14, -12, -1);
  assert.equal(free.gain, 6);
  assert.equal(free.headroomLimited, false);
  const lim = C.playbackGain("updown", -20, -14, -4, -1);
  assert.equal(lim.gain, 3);
  assert.equal(lim.headroomLimited, true);
  const unk = C.playbackGain("updown", -20, -14, null, -1);
  assert.equal(unk.headroomUnknown, true);
  assert.equal(C.playbackGain("none", -20, -14, null), null);
});

test("standards table: values match the confirmed list", () => {
  const v = (id) => { const s = S.byId(id); return [s.target, s.tolerance, s.tpLimit, s.status]; };
  assert.deepEqual(v("ebu"), [-23, 1, -1, "official"]);
  assert.deepEqual(v("atsc"), [-24, 2, -2, "official"]);
  assert.deepEqual(v("spotify"), [-14, null, -1, "official"]);
  assert.deepEqual(v("youtube"), [-14, null, -1, "recommended"]);
  assert.deepEqual(v("apple"), [-16, null, -1, "recommended"]);
  assert.deepEqual(v("amazon"), [-14, null, -2, "recommended"]);
  assert.deepEqual(v("bbc"), [-23, 1, -1, "recommended"]);
  assert.deepEqual(v("podcast"), [-16, 1, -1, "official"]);
  for (const s of S.list) if (s.status === "official") assert.ok(s.source && s.source.url.startsWith("https://"));
});
