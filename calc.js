/* Loudness Target Calculator — calculation logic (pure functions, no DOM).
   © 2026 Graziano Melzi · OnAir Garage — MIT License */
(function (root) {
  "use strict";

  var EPS = 1e-9;

  // Accepts "-23.5", "−23,5" (U+2212 minus, decimal comma) and surrounding spaces.
  // Returns null for empty or invalid text.
  function parseNumber(text) {
    if (typeof text !== "string") return null;
    var s = text.trim().replace(/−/g, "-").replace(",", ".");
    if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // Loudness meters show one decimal place; compare at that resolution so a
  // value that displays as "-1.0" is never flagged as over a -1.0 limit.
  function round1(x) {
    return Math.round((x + EPS * Math.sign(x)) * 10) / 10;
  }

  /* compute({ input, target, tp, tpLimit, tolerance })
       input     measured integrated loudness, LUFS (required)
       target    target loudness, LUFS (required)
       tp        measured true peak, dBTP (null when not entered)
       tpLimit   true-peak ceiling, dBTP (null when the standard has none)
       tolerance +/- LU around the target (null when none) */
  function compute(o) {
    var gain = o.target - o.input;
    var hasTp = o.tp !== null && o.tp !== undefined;
    var hasLimit = o.tpLimit !== null && o.tpLimit !== undefined;
    var r = {
      gain: gain,
      resultLufs: o.input + gain,
      resultTp: hasTp ? o.tp + gain : null,
      deviation: o.input - o.target,
      withinTolerance: false,
      tpChecked: hasTp && hasLimit,
      tpOver: false,
      overBy: 0,
      maxSafeGain: null,
      maxSafeLufs: null
    };
    if (o.tolerance !== null && o.tolerance !== undefined) {
      r.withinTolerance = Math.abs(round1(r.deviation)) <= o.tolerance + EPS;
    }
    if (r.tpChecked) {
      r.overBy = round1(r.resultTp) - o.tpLimit;
      r.tpOver = r.overBy > EPS;
      r.maxSafeGain = o.tpLimit - o.tp;
      r.maxSafeLufs = o.input + r.maxSafeGain;
      if (!r.tpOver) r.overBy = 0;
    }
    return r;
  }

  /* playbackGain(mode, input, target, tp, headroomTp)
     Gain a streaming platform applies at playback to a file as it is.
       mode "down"   : only turns louder files down
       mode "updown" : also turns quieter files up, limited by headroom
     Returns { gain, headroomLimited, headroomUnknown } or null (mode "none"). */
  function playbackGain(mode, input, target, tp, headroomTp) {
    if (mode !== "down" && mode !== "updown") return null;
    var g = target - input;
    var out = { gain: 0, headroomLimited: false, headroomUnknown: false };
    if (mode === "down") {
      out.gain = Math.min(0, g);
      return out;
    }
    if (g > 0) {
      if (tp === null || tp === undefined) {
        out.headroomUnknown = true;
      } else if (tp + g > headroomTp + EPS) {
        g = headroomTp - tp;
        out.headroomLimited = true;
      }
    }
    out.gain = g;
    return out;
  }

  var api = { parseNumber: parseNumber, round1: round1, compute: compute, playbackGain: playbackGain };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LoudnessCalc = api;
})(typeof self !== "undefined" ? self : this);
