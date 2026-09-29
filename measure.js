/* Loudness Target Calculator — measure a local audio file (decode + analyse, all on this device).
   © 2026 Graziano Melzi · OnAir Garage — MIT License */
(function (root) {
  "use strict";

  var MAX_BYTES = 800 * 1024 * 1024;   // largest file accepted
  var MAX_SECONDS = 90 * 60;           // longest audio accepted
  var SNIFF_BYTES = 1024 * 1024;
  var LOSSY = ["mp3", "m4a", "aac", "mp4", "ogg", "oga", "opus", "wma"];

  var worker = null;

  function fail(code, detail) { var e = new Error(code); e.code = code; e.detail = detail; return e; }

  function readBytes(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(new Uint8Array(r.result)); };
      r.onerror = function () { reject(fail("read")); };
      r.readAsArrayBuffer(blob);
    });
  }

  function makeContext(rate) {
    var Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) throw fail("unsupported");
    if (rate) { try { return new Ctx({ sampleRate: rate }); } catch (e) { /* rate not supported: use the default */ } }
    return new Ctx();
  }

  function decode(ctx, buffer) {
    return new Promise(function (resolve, reject) {
      var p = ctx.decodeAudioData(buffer, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
  }

  function cancel() {
    if (worker) { worker.terminate(); worker = null; }
  }

  /* measureFile(file, onStatus) -> Promise<result>
     onStatus({ phase: "decode" }) / ({ phase: "analyse", fraction }) */
  function measureFile(file, onStatus) {
    onStatus = onStatus || function () {};
    if (file.size > MAX_BYTES) return Promise.reject(fail("tooBig"));
    var ctx = null, fileRate = null, info = {};

    onStatus({ phase: "decode" });
    return Promise.all([
      readBytes(file.slice(0, SNIFF_BYTES)),
      readBytes(file.slice(Math.max(0, file.size - SNIFF_BYTES)))
    ]).then(function (parts) {
      fileRate = root.LoudnessAnalyzer.sniffSampleRate(parts[0], parts[1]);
      return file.arrayBuffer ? file.arrayBuffer() : readBytes(file).then(function (u) { return u.buffer; });
    }).then(function (buffer) {
      ctx = makeContext(fileRate);
      return decode(ctx, buffer);
    }).then(function (audio) {
      if (audio.duration > MAX_SECONDS) throw fail("tooLong");
      info = { fileRate: fileRate, decodedRate: audio.sampleRate };
      return analyse(audio, onStatus);
    }).then(function (result) {
      result.fileRate = info.fileRate;
      result.resampled = info.fileRate !== null && info.fileRate !== result.sampleRate;
      result.rateUnknown = info.fileRate === null;
      return result;
    }).then(function (r) { if (ctx && ctx.close) ctx.close(); return r; },
            function (e) { if (ctx && ctx.close) ctx.close(); throw (e && e.code ? e : fail("decode", e && e.message)); });
  }

  function analyse(audio, onStatus) {
    return new Promise(function (resolve, reject) {
      cancel();
      try { worker = new Worker("analyzer-worker.js"); } catch (e) { reject(fail("unsupported")); return; }
      var w = worker, index = 0, n = audio.numberOfChannels;
      function sendNext() {
        var copy = new Float32Array(audio.getChannelData(index));   // copy: the AudioBuffer stays usable
        w.postMessage({ type: "channel", index: index, data: copy }, [copy.buffer]);
      }
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === "progress") onStatus({ phase: "analyse", fraction: m.fraction });
        else if (m.type === "channelDone") { index++; if (index < n) sendNext(); else w.postMessage({ type: "finish" }); }
        else if (m.type === "result") { worker = null; w.terminate(); resolve(m.result); }
        else if (m.type === "error") { worker = null; w.terminate(); reject(fail("analyse", m.message)); }
      };
      w.onerror = function () { worker = null; reject(fail("analyse")); };
      w.postMessage({ type: "init", fs: audio.sampleRate, channels: n, length: audio.length });
      onStatus({ phase: "analyse", fraction: 0 });
      sendNext();
    });
  }

  function isLossy(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return !!m && LOSSY.indexOf(m[1].toLowerCase()) !== -1;
  }

  root.LoudnessMeasure = { measureFile: measureFile, cancel: cancel, isLossy: isLossy, MAX_BYTES: MAX_BYTES, MAX_SECONDS: MAX_SECONDS };
})(typeof self !== "undefined" ? self : this);
