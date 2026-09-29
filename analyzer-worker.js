/* Loudness Target Calculator — analysis worker: runs the BS.1770 analyser off the UI thread.
   © 2026 Graziano Melzi · OnAir Garage — MIT License */
"use strict";
importScripts("analyzer.js");

var analyzer = null;

self.onmessage = function (e) {
  var m = e.data;
  try {
    if (m.type === "init") {
      analyzer = self.LoudnessAnalyzer.create(m.fs, m.channels, m.length);
    } else if (m.type === "channel") {
      analyzer.addChannel(m.index, m.data, function (fraction) { self.postMessage({ type: "progress", fraction: fraction }); });
      self.postMessage({ type: "channelDone", index: m.index });
    } else if (m.type === "finish") {
      self.postMessage({ type: "result", result: analyzer.finish() });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String((err && err.message) || err) });
  }
};
