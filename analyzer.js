/* Loudness Target Calculator — ITU-R BS.1770 loudness and true-peak analyser.
   © 2026 Graziano Melzi · OnAir Garage — MIT License

   Own implementation (no third-party code) of:
   - K-weighting (two biquads; coefficients derived for any sample rate),
   - channel weighting, 400 ms blocks with 75 % overlap,
   - two-stage gating (absolute -70 LUFS, relative -10 LU), i.e. BS.1770-4 gating,
   - true peak by oversampling (4x below 96 kHz, 2x below 192 kHz).
   Whole-programme loudness only: no dialogue gating, no loudness range.
   Validated against the EBU Tech 3341 test signals (see dev/ and README).

   Usage: var a = LoudnessAnalyzer.create(sampleRate, channelCount, length);
          a.addChannel(index, float32Array [, onProgress]); ... a.finish(); */
(function (root) {
  "use strict";

  var OFFSET = -0.691;        // BS.1770 loudness offset, dB
  var ABS_GATE = -70;         // LUFS
  var REL_GATE = -10;         // LU below the ungated mean
  var TP_SKIP = 0.35;         // skip oversampling where both neighbours are below this fraction of the running peak
  var TP_HALF_SPAN = 12;      // interpolation filter half-length, in input samples
  var TP_KAISER_BETA = 9;

  // ---- K-weighting ------------------------------------------------------
  // Stage 1: high shelf (head-related). Stage 2: RLB high-pass. The analogue
  // parameters below reproduce the published 48 kHz coefficients; for other
  // sample rates the same filters are re-derived with the bilinear transform.
  function kWeighting(fs) {
    var f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    var K = Math.tan(Math.PI * f0 / fs);
    var Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    var a0 = 1 + K / Q + K * K;
    var shelf = {
      b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
      a: [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    };
    var f1 = 38.13547087602444, Q1 = 0.5003270373238773;
    var K1 = Math.tan(Math.PI * f1 / fs);
    var a01 = 1 + K1 / Q1 + K1 * K1;
    var hp = { b: [1, -2, 1], a: [1, 2 * (K1 * K1 - 1) / a01, (1 - K1 / Q1 + K1 * K1) / a01] };
    return { shelf: shelf, hp: hp };
  }

  // ---- channel weights --------------------------------------------------
  // Assumed file order: mono; L R; L R C; 5.0 = L R C Ls Rs; 5.1 = L R C LFE Ls Rs.
  // The LFE channel is not included in the measurement; surround channels weigh 1.41.
  function channelWeights(n) {
    if (n === 1) return { w: [1], assumed: false };
    if (n === 2) return { w: [1, 1], assumed: false };
    if (n === 3) return { w: [1, 1, 1], assumed: false };
    if (n === 5) return { w: [1, 1, 1, 1.41, 1.41], assumed: false };
    if (n === 6) return { w: [1, 1, 1, 0, 1.41, 1.41], assumed: false };
    var w = []; for (var i = 0; i < n; i++) w.push(1);
    return { w: w, assumed: true };
  }

  // ---- true-peak interpolator ------------------------------------------
  function bessel0(x) {
    var sum = 1, term = 1, k = 1;
    while (term > 1e-12 * sum) { term *= (x / (2 * k)) * (x / (2 * k)); sum += term; k++; }
    return sum;
  }
  // Windowed-sinc phases: y(n + p/L) = sum_m x[n+m] * h[p][m + M - 1], m = -M+1..M
  function buildPhases(L) {
    var M = TP_HALF_SPAN, phases = [], norm = bessel0(TP_KAISER_BETA);
    for (var p = 1; p < L; p++) {
      var h = new Float64Array(2 * M);
      for (var m = -M + 1; m <= M; m++) {
        var t = p / L - m;
        var s = Math.abs(t) < 1e-12 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
        var r = t / M;
        var win = Math.abs(r) >= 1 ? 0 : bessel0(TP_KAISER_BETA * Math.sqrt(1 - r * r)) / norm;
        h[m + M - 1] = s * win;
      }
      phases.push(h);
    }
    return phases;
  }
  // BS.1770-5 Annex 2 asks for an oversampled rate of at least 192 kHz; 4x gives 176.4 kHz at 44.1 kHz,
  // which is enough because the interpolator is band-limited to the original Nyquist frequency.
  function oversampleFactor(fs) { return fs < 96000 ? 4 : (fs < 192000 ? 2 : 1); }

  // Max |value| of the interpolated signal, and of the plain samples.
  function peaks(x, L, phases, startPeak) {
    var n = x.length, M = TP_HALF_SPAN, best = startPeak, samplePeak = 0, i, a;
    for (i = 0; i < n; i++) { a = x[i] < 0 ? -x[i] : x[i]; if (a > samplePeak) samplePeak = a; }
    if (samplePeak > best) best = samplePeak;
    if (L === 1) return { sample: samplePeak, tp: best };
    var cur = samplePeak, next, p, m, acc, h, idx, y;
    // skip test: oversample only where the neighbourhood is near the loudest sample
    var run = startPeak > samplePeak ? startPeak : samplePeak;
    for (i = 0; i < n - 1; i++) {
      a = x[i] < 0 ? -x[i] : x[i];
      next = x[i + 1] < 0 ? -x[i + 1] : x[i + 1];
      if (a > run) run = a;
      if (next > run) run = next;
      if ((a < next ? next : a) < TP_SKIP * run) continue;
      for (p = 0; p < phases.length; p++) {
        h = phases[p]; acc = 0;
        for (m = -M + 1; m <= M; m++) {
          idx = i + m;
          if (idx >= 0 && idx < n) acc += x[idx] * h[m + M - 1];
        }
        y = acc < 0 ? -acc : acc;
        if (y > run) run = y;
        if (y > best) best = y;
      }
    }
    return { sample: samplePeak, tp: best > run ? best : run };
  }

  // ---- analyser ---------------------------------------------------------
  function toDb(x) { return x > 0 ? 20 * Math.log10(x) : null; }

  function create(fs, channelCount, length) {
    var hop = Math.round(0.1 * fs);
    var subCount = Math.floor(length / hop);
    var sub = new Float64Array(subCount);           // weighted energy per 100 ms sub-block
    var cw = channelWeights(channelCount);
    var coef = kWeighting(fs);
    var L = oversampleFactor(fs), phases = buildPhases(L);
    var tp = 0, sp = 0, done = 0;

    function addChannel(index, x, onProgress) {
      var g = cw.w[index] === undefined ? 1 : cw.w[index];
      var pk = peaks(x, L, phases, tp);               // true peak counts on every channel, LFE included
      if (onProgress) onProgress((done + 0.5) / channelCount);
      if (pk.tp > tp) tp = pk.tp;
      if (pk.sample > sp) sp = pk.sample;
      if (g > 0 && subCount > 0) {
        var b1 = coef.shelf.b, a1 = coef.shelf.a, b2 = coef.hp.b, a2 = coef.hp.a;
        var x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, v1 = 0, v2 = 0;
        var end = subCount * hop, j = 0, acc = 0, cnt = 0, s, y, v;
        for (var i = 0; i < end; i++) {
          s = x[i];
          y = b1[0] * s + b1[1] * x1 + b1[2] * x2 - a1[1] * y1 - a1[2] * y2;
          x2 = x1; x1 = s; y2 = y1; y1 = y;
          v = b2[0] * y + b2[1] * u1 + b2[2] * u2 - a2[1] * v1 - a2[2] * v2;
          u2 = u1; u1 = y; v2 = v1; v1 = v;
          acc += v * v;
          if (++cnt === hop) { sub[j++] += g * acc; acc = 0; cnt = 0; }
        }
      }
      done++;
      if (onProgress) onProgress(done / channelCount);
    }

    function finish() {
      var win = 4 * hop, blocks = subCount - 3, res = {
        integrated: null, truePeak: toDb(tp), samplePeak: toDb(sp),
        sampleRate: fs, channels: channelCount, duration: length / fs,
        blocks: Math.max(blocks, 0), gatedBlocks: 0,
        assumedLayout: cw.assumed, oversampling: L
      };
      if (blocks < 1) return res;
      var E = new Float64Array(blocks), k, sum = 0, n = 0;
      var absE = Math.pow(10, (ABS_GATE - OFFSET) / 10);
      for (k = 0; k < blocks; k++) {
        E[k] = (sub[k] + sub[k + 1] + sub[k + 2] + sub[k + 3]) / win;
        if (E[k] > absE) { sum += E[k]; n++; }
      }
      if (n === 0) return res;
      var relE = Math.pow(10, (OFFSET + 10 * Math.log10(sum / n) + REL_GATE - OFFSET) / 10);
      sum = 0; n = 0;
      for (k = 0; k < blocks; k++) if (E[k] > absE && E[k] > relE) { sum += E[k]; n++; }
      res.gatedBlocks = n;
      if (n > 0) res.integrated = OFFSET + 10 * Math.log10(sum / n);
      return res;
    }
    return { addChannel: addChannel, finish: finish };
  }

  // Convenience for tests and small inputs: analyse an array of Float32Array channels.
  function analyze(channels, fs) {
    var a = create(fs, channels.length, channels[0].length);
    for (var c = 0; c < channels.length; c++) a.addChannel(c, channels[c]);
    return a.finish();
  }

  // ---- sample-rate sniffing (so the browser can decode without resampling) ----
  var MP3_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  var COMMON_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000, 64000, 88200, 96000, 176400, 192000];
  function ascii(b, o, s) { for (var i = 0; i < s.length; i++) if (b[o + i] !== s.charCodeAt(i)) return false; return true; }
  function find(b, s, from, to) {
    var end = Math.min(b.length - s.length, to === undefined ? b.length : to);
    for (var i = from || 0; i <= end; i++) if (ascii(b, i, s)) return i;
    return -1;
  }
  function u32be(b, o) { return ((b[o] * 16777216) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]) >>> 0; }
  function u32le(b, o) { return ((b[o + 3] * 16777216) + (b[o + 2] << 16) + (b[o + 1] << 8) + b[o]) >>> 0; }

  // head/tail: Uint8Array of the first/last bytes of the file (tail optional). Returns Hz or null.
  function sniffSampleRate(head, tail) {
    var b = head, i;
    if (b.length > 28 && (ascii(b, 0, "RIFF") || ascii(b, 0, "RF64") || ascii(b, 0, "BW64")) && ascii(b, 8, "WAVE")) {
      i = find(b, "fmt ", 12);
      return i >= 0 ? u32le(b, i + 12) : null;
    }
    if (b.length > 21 && ascii(b, 0, "fLaC")) return (b[18] << 12) | (b[19] << 4) | (b[20] >> 4);
    if (b.length > 40 && ascii(b, 0, "OggS")) {
      if ((i = find(b, "OpusHead", 0, 200)) >= 0) return 48000;   // Opus always decodes at 48 kHz
      if ((i = find(b, "\x01vorbis", 0, 200)) >= 0) return u32le(b, i + 12);
      return null;
    }
    if (b.length > 12 && ascii(b, 4, "ftyp")) {
      var sources = [head, tail || new Uint8Array(0)];
      for (var s = 0; s < sources.length; s++) {
        var d = sources[s], from = 0, at;
        while ((at = find(d, "mdhd", from)) >= 0) {
          var ver = d[at + 4], rate = ver === 1 ? u32be(d, at + 24) : u32be(d, at + 16);
          if (COMMON_RATES.indexOf(rate) >= 0 && rate !== 90000) return rate;
          from = at + 4;
        }
      }
      return null;
    }
    var off = 0;
    if (ascii(b, 0, "ID3") && b.length > 10) off = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
    for (i = off; i < Math.min(b.length - 4, off + 8192); i++) {
      if (b[i] === 0xFF && (b[i + 1] & 0xE0) === 0xE0) {
        var ver2 = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, sr = (b[i + 2] >> 2) & 3;
        if (ver2 !== 1 && layer !== 0 && sr !== 3 && MP3_RATES[ver2]) return MP3_RATES[ver2][sr];
      }
    }
    return null;
  }

  var api = {
    create: create, analyze: analyze, sniffSampleRate: sniffSampleRate,
    kWeighting: kWeighting, channelWeights: channelWeights,
    oversampleFactor: oversampleFactor, _peaks: peaks, _buildPhases: buildPhases
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LoudnessAnalyzer = api;
})(typeof self !== "undefined" ? self : this);
