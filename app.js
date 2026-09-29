/* Loudness Target Calculator — UI.
   © 2026 Graziano Melzi · OnAir Garage — MIT License */
(function () {
  "use strict";

  var VERSION = "2026.9.5";
  var STORE = "com.onairgarage.loudnesscalculator.";
  var Calc = window.LoudnessCalc;
  var Std = window.LoudnessStandards;
  var I18n = window.LoudnessI18n;

  var LUFS_MIN = -70, LUFS_MAX = 0, TP_MIN = -70, TP_MAX = 12;
  var GROUPS = ["broadcast", "streaming", "podcast"];

  function $(id) { return document.getElementById(id); }

  function load(key, fallback) {
    try { var v = localStorage.getItem(STORE + key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(STORE + key, value); } catch (e) { /* storage unavailable */ }
  }

  var state = {
    lang: load("lang", null),
    theme: load("theme", "auto"),
    std: load("std", "ebu")
  };
  if (I18n.langs.indexOf(state.lang) === -1) state.lang = "en";   // always opens in English; a manual choice is remembered
  if (["auto", "light", "dark"].indexOf(state.theme) === -1) state.theme = "auto";
  if (state.std !== "custom" && !Std.byId(state.std)) state.std = "ebu";
  var locked = state.std !== "custom";   // presets lock the target on the scale; Custom unlocks it
  var scaleWin = null;                   // { lo, hi, step } of the scale as drawn
  var frozenWin = null;                  // window kept fixed while dragging, so the scale does not rescale under the pointer
  var dragging = false;

  function t() { return I18n.t.apply(null, [state.lang].concat([].slice.call(arguments))); }

  // ---------- number formatting ----------
  function fmt(n, signed) {
    var r = Calc.round1(n);
    if (Object.is(r, -0) || r === 0) r = 0;
    var s = Math.abs(r).toFixed(1);
    if (state.lang !== "en") s = s.replace(".", ",");
    if (r < 0) return "−" + s;
    return (signed && r > 0 ? "+" : "") + s;
  }

  // ---------- language & theme ----------
  function applyLang() {
    document.documentElement.lang = state.lang;
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    var aria = document.querySelectorAll("[data-i18n-aria]");
    for (var k = 0; k < aria.length; k++) aria[k].setAttribute("aria-label", t(aria[k].getAttribute("data-i18n-aria")));
    $("langSel").setAttribute("aria-label", t("ctl.language"));
    buildStandardSelect();
    render();
    if (lastMeasure) showMeasureResult();
  }

  function applyTheme() {
    var root = document.documentElement;
    if (state.theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", state.theme);
    var dark = state.theme === "dark" ||
      (state.theme === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#14110d" : "#ece6d8");
  }

  function buildLangSelect() {
    var sel = $("langSel");
    I18n.langs.forEach(function (code) {
      var o = document.createElement("option");
      o.value = code; o.textContent = I18n.names[code];
      sel.appendChild(o);
    });
    sel.value = state.lang;
  }

  function buildStandardSelect() {
    var sel = $("stdSel");
    sel.textContent = "";
    GROUPS.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = t("group." + g);
      Std.list.forEach(function (s) {
        if (s.group !== g) return;
        var o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.name + " · " + fmt(s.target) + " LUFS";
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    var other = document.createElement("optgroup");
    other.label = t("group.other");
    var c = document.createElement("option");
    c.value = "custom"; c.textContent = t("std.custom");
    other.appendChild(c);
    sel.appendChild(other);
    sel.value = state.std;
  }

  // ---------- inputs ----------
  // negOnly: loudness values are never positive, so a typed "18.4" counts as -18.4
  // (phone keypads often have no minus key).
  function readField(id, min, max, optional, negOnly) {
    var raw = $(id).value;
    if (raw.trim() === "") return { empty: true, ok: optional, value: null };
    var n = Calc.parseNumber(raw);
    if (negOnly && n !== null && n > 0) n = -n;
    if (n === null || n < min || n > max) return { empty: false, ok: false, value: null };
    return { empty: false, ok: true, value: n };
  }

  function showError(id, bad) {
    $(id).hidden = !bad;
  }

  function currentStandard(custom) {
    if (state.std === "custom") {
      return {
        id: "custom", name: t("std.custom").replace("…", ""), target: custom.target.value,
        tolerance: null, tpLimit: custom.limit.value, status: "custom", source: null
      };
    }
    return Std.byId(state.std);
  }

  // ---------- scale ----------
  var STEPS = [1, 2, 5, 10];
  var MINOR_DIV = { 1: 2, 2: 2, 5: 5, 10: 5 };

  function setPos(el, pct) { el.style.left = pct + "%"; }

  function renderScale(v) {
    var pts = [v.target];
    if (v.tolerance !== null) pts.push(v.target - v.tolerance, v.target + v.tolerance);
    if (v.input !== null) pts.push(v.input, v.result);
    if (v.safe !== null) pts.push(v.safe);
    var lo, hi, step;
    if (frozenWin) { lo = frozenWin.lo; hi = frozenWin.hi; step = frozenWin.step; }
    else {
      lo = Math.min.apply(null, pts) - 3; hi = Math.max.apply(null, pts) + 3;
      if (hi - lo < 12) { var mid = (hi + lo) / 2; lo = mid - 6; hi = mid + 6; }
      step = 10;
      for (var i = 0; i < STEPS.length; i++) if ((hi - lo) / STEPS[i] <= 10) { step = STEPS[i]; break; }
      lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    }
    scaleWin = { lo: lo, hi: hi, step: step };
    var span = hi - lo;
    function pct(x) { return ((x - lo) / span) * 100; }

    var ticks = $("scaleTicks"), nums = $("scaleNums");
    ticks.textContent = ""; nums.textContent = "";
    var minor = step / MINOR_DIV[step];
    for (var x = lo; x <= hi + 1e-9; x += minor) {
      var isMajor = Math.abs(x / step - Math.round(x / step)) < 1e-9;
      var tk = document.createElement("i");
      tk.className = "tick" + (isMajor ? " tick--major" : "");
      setPos(tk, pct(x));
      ticks.appendChild(tk);
      if (isMajor) {
        var nm = document.createElement("span");
        nm.textContent = String(Math.round(x)).replace("-", "−");
        setPos(nm, pct(x));
        nums.appendChild(nm);
      }
    }

    var band = $("scaleBand");
    if (v.tolerance !== null) {
      band.hidden = false;
      setPos(band, pct(v.target - v.tolerance));
      band.style.width = (pct(v.target + v.tolerance) - pct(v.target - v.tolerance)) + "%";
    } else band.hidden = true;

    var mkTarget = $("mkTarget"), mkInput = $("mkInput"), mkResult = $("mkResult"), mkSafe = $("mkSafe");
    var spanEl = $("scaleSpan");
    var tagT = mkTarget.firstElementChild;
    setPos(mkTarget, pct(v.target)); mkTarget.hidden = false;

    var haveIn = v.input !== null;
    mkInput.hidden = !haveIn; mkResult.hidden = true; mkSafe.hidden = v.safe === null; spanEl.hidden = true;
    $("lgSafe").hidden = v.safe === null;
    tagT.textContent = t("scale.target");
    mkTarget.className = "scale__mark scale__mark--target scale__mark--top";
    mkInput.className = "scale__mark scale__mark--input scale__mark--top";
    mkResult.className = "scale__mark scale__mark--result scale__mark--bottom";
    mkSafe.className = "scale__mark scale__mark--safe scale__mark--bottom";

    if (haveIn) {
      setPos(mkInput, pct(v.input));
      if (Math.abs(pct(v.input) - pct(v.target)) < 12) mkTarget.className = "scale__mark scale__mark--target scale__mark--bottom";
      var same = Math.abs(v.result - v.target) < 0.05;
      if (same) {
        tagT.textContent = t("scale.target") + " · " + t("scale.result");
      } else {
        mkResult.hidden = false; setPos(mkResult, pct(v.result));
      }
      var a = Math.min(v.input, v.result), b = Math.max(v.input, v.result);
      if (b - a > 0.001) {
        spanEl.hidden = false; setPos(spanEl, pct(a)); spanEl.style.width = (pct(b) - pct(a)) + "%";
        spanEl.className = "scale__span" + (v.warn ? " scale__span--warn" : "");
      }
      if (v.safe !== null) {
        setPos(mkSafe, pct(v.safe));
        // keep the MAX tag clear of the target tag when both sit below the bar
        if (mkTarget.classList.contains("scale__mark--bottom") && Math.abs(pct(v.safe) - pct(v.target)) < 14) {
          mkSafe.className = "scale__mark scale__mark--safe scale__mark--top";
        }
      }
    }
  }

  // ---------- info panel ----------
  function addRow(dl, label, valueNode) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt"); dt.textContent = label;
    var dd = document.createElement("dd"); dd.appendChild(valueNode);
    wrap.appendChild(dt); wrap.appendChild(dd); dl.appendChild(wrap);
  }
  function text(s) { return document.createTextNode(s); }

  function renderInfo(s) {
    $("infoName").textContent = s.id === "custom" ? t("std.custom").replace("…", "") : s.name;
    var badge = $("infoBadge");
    if (s.status === "official") { badge.textContent = t("info.official"); badge.className = "badge badge--official"; }
    else if (s.status === "recommended") { badge.textContent = t("info.recommended"); badge.className = "badge badge--reco"; }
    else { badge.textContent = ""; badge.className = "badge badge--hidden"; }

    var dl = $("infoGrid"); dl.textContent = "";
    addRow(dl, t("info.target"), text(s.target === null ? "—" : fmt(s.target) + " LUFS"));
    var tolKey = { ebu: "info.tolEbu", atsc: "info.tolAtsc", bbc: "info.tolBbc", podcast: "info.tolPodcast" }[s.id];
    addRow(dl, t("info.tolerance"), text(s.tolerance !== null && tolKey ? t(tolKey, fmt(s.tolerance).replace("−", "")) : t("info.none")));
    var tpNode = document.createElement("span");
    tpNode.appendChild(text(s.tpLimit === null ? t("info.none") : fmt(s.tpLimit) + " dBTP"));
    var tpKey = "info.tpNote." + s.id;
    if (s.tpLimit !== null && s.id !== "custom") {
      var note = document.createElement("small");
      note.textContent = I18n.strings.en[tpKey] ? t(tpKey) : t("info.tpNote.generic");
      tpNode.appendChild(document.createElement("br")); tpNode.appendChild(note);
    }
    addRow(dl, t("info.tpLimit"), tpNode);
    if (s.source) {
      var a = document.createElement("a");
      a.href = s.source.url; a.textContent = s.source.label; a.rel = "noopener"; a.target = "_blank";
      addRow(dl, t("info.source"), a);
    }
    $("infoNote").textContent = s.status === "recommended" ? t("info.recommendedNote") : (s.status === "custom" ? t("info.customNote") : "");
    $("infoMeasure").textContent = s.id === "atsc" ? t("info.measureNote.atsc") : "";
  }

  function renderPlayback(s, input, tp) {
    var box = $("play");
    if (!s.playback || input === null) { box.hidden = true; return; }
    var pb = Calc.playbackGain(s.playback.mode, input, s.target, tp, s.playback.headroomTp);
    if (!pb) { box.hidden = true; return; }
    var msg = t(s.playback.mode === "updown" ? "play.updown" : "play.down", s.name, fmt(pb.gain, true));
    if (pb.headroomLimited) msg += t("play.updownLimited");
    if (pb.headroomUnknown) msg += t("play.updownUnknown");
    if (s.status !== "official") msg += " " + t("play.unofficial");
    $("playBody").textContent = msg;
    box.hidden = false;
  }

  // ---------- main render ----------
  function setStatus(key, args, state_) {
    $("status").textContent = t.apply(null, [key].concat(args || []));
    $("lcd").setAttribute("data-state", state_);
  }

  function render() {
    renderMain();
    syncLock();
  }

  function renderMain() {
    var lufs = readField("lufsIn", LUFS_MIN, LUFS_MAX, false, true);
    var tp = readField("tpIn", TP_MIN, TP_MAX, true);
    var custom = { target: readField("cTarget", LUFS_MIN, LUFS_MAX, false, true), limit: readField("cLimit", TP_MIN, TP_MAX, true) };
    var isCustom = state.std === "custom";

    $("customBox").hidden = !isCustom;
    showError("lufsErr", !lufs.empty && !lufs.ok);
    showError("tpErr", !tp.empty && !tp.ok);
    showError("cTargetErr", isCustom && !custom.target.empty && !custom.target.ok);
    showError("cLimitErr", isCustom && !custom.limit.empty && !custom.limit.ok);

    var s = isCustom ? currentStandard(custom) : Std.byId(state.std);
    var targetOk = !isCustom || custom.target.ok;
    var limitOk = !isCustom || custom.limit.ok;
    var tpVal = tp.ok ? tp.value : null;
    var tpInvalid = !tp.empty && !tp.ok;

    renderInfo(isCustom ? { id: "custom", name: "", target: targetOk ? s.target : null, tolerance: null, tpLimit: limitOk ? s.tpLimit : null, status: "custom", source: null } : s);

    $("rdTarget").textContent = targetOk ? fmt(s.target) : "—";
    $("warn").hidden = true;

    var ready = lufs.ok && targetOk && limitOk && !tpInvalid;
    if (!ready) {
      $("gainOut").textContent = "— —";
      $("rdInput").textContent = lufs.ok ? fmt(lufs.value) : "—";
      $("rdResult").textContent = "—"; $("rdTp").textContent = "—"; $("rdTpLimit").textContent = "";
      $("rdTpCell").removeAttribute("data-state");
      setStatus("display.idle", null, "idle");
      if (targetOk) renderScale({ target: s.target, tolerance: s.tolerance, input: null, result: null, safe: null, warn: false });
      renderPlayback(isCustom ? { playback: null } : s, null, null);
      return;
    }

    var r = Calc.compute({ input: lufs.value, target: s.target, tp: tpVal, tpLimit: s.tpLimit, tolerance: s.tolerance });
    $("gainOut").textContent = fmt(r.gain, true);
    $("rdInput").textContent = fmt(lufs.value);
    $("rdResult").textContent = fmt(r.resultLufs);
    $("rdTp").textContent = r.resultTp === null ? "—" : fmt(r.resultTp);
    $("rdTpLimit").textContent = s.tpLimit === null ? t("read.noLimit") : t("read.limit", fmt(s.tpLimit));
    $("rdTpCell").setAttribute("data-state", r.tpOver ? "over" : (r.tpChecked ? "ok" : "none"));

    if (r.tpOver) {
      setStatus("warn.title", null, "warn");
      var neg = r.maxSafeGain < 0;
      $("warnBody").textContent = t(neg ? "warn.body.negative" : "warn.body",
        fmt(r.gain, true), fmt(r.resultTp), fmt(r.overBy), fmt(s.tpLimit),
        neg ? fmt(-r.maxSafeGain) : fmt(r.maxSafeGain, true), fmt(r.maxSafeLufs));
      $("warn").hidden = false;
    } else if (r.withinTolerance) {
      setStatus("display.within", [fmt(s.tolerance).replace("−", "")], "ok");
    } else if (s.tpLimit !== null && tpVal === null) {
      setStatus("display.tpSkipped", null, "ok");
    } else if (r.tpChecked) {
      setStatus("display.tpOk", [fmt(s.tpLimit)], "ok");
    } else {
      setStatus("display.reached", null, "ok");
    }

    renderScale({
      target: s.target, tolerance: s.tolerance, input: lufs.value, result: r.resultLufs,
      safe: r.tpOver ? r.maxSafeLufs : null, warn: r.tpOver
    });
    $("scaleDesc").textContent = t("read.input") + " " + fmt(lufs.value) + " LUFS, " + t("read.target") + " " +
      fmt(s.target) + " LUFS, " + t("display.gain") + " " + fmt(r.gain, true) + " dB.";
    renderPlayback(isCustom ? { playback: null } : s, lufs.value, tpVal);
  }

  // ---------- measure from a file ----------
  var Measure = window.LoudnessMeasure;
  var measureRun = 0;
  var lastMeasure = null;   // { name, lossy, result } kept so the text follows a language change

  function chanLabel(n) { return n === 1 ? t("meas.chan.mono") : (n === 2 ? t("meas.chan.stereo") : t("meas.chan.n", n)); }
  function fmtDuration(sec) {
    var s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return h > 0 ? h + ":" + p(m) + ":" + p(r) : m + ":" + p(r);
  }
  function fmtKHz(hz) {
    var v = String(Math.round(hz / 100) / 10);
    return state.lang === "en" ? v : v.replace(".", ",");
  }
  function setMeasStatus(kind, msg) {
    var el = $("measStatus");
    el.textContent = msg;
    el.setAttribute("data-kind", kind);
  }
  function setMeasBusy(busy) {
    $("fileBtn").disabled = busy;
    $("fileCancel").hidden = !busy;
    $("measProg").hidden = !busy;
  }
  function addNote(list, text) {
    var li = document.createElement("li"); li.textContent = text; list.appendChild(li);
  }

  function showMeasureResult() {
    var notes = $("measNotes"); notes.textContent = "";
    if (!lastMeasure) return;
    var r = lastMeasure.result;
    if (r.integrated === null) { setMeasStatus("error", t("meas.err.silent")); return; }
    var lines = [
      t("meas.done", lastMeasure.name),
      t("meas.summary", fmtDuration(r.duration), fmtKHz(r.sampleRate) + " kHz", chanLabel(r.channels)),
      t("meas.values", fmt(r.integrated), r.truePeak === null ? "\u2014" : fmt(r.truePeak), r.samplePeak === null ? "\u2014" : fmt(r.samplePeak)),
      t("meas.filled")
    ];
    setMeasStatus("ok", lines.join("\n"));
    addNote(notes, t("meas.note.full"));
    if (r.resampled) addNote(notes, t("meas.note.resampled", fmtKHz(r.fileRate), fmtKHz(r.sampleRate)));
    else if (r.rateUnknown) addNote(notes, t("meas.note.rateUnknown", fmtKHz(r.sampleRate)));
    if (r.assumedLayout) addNote(notes, t("meas.note.layout", r.channels));
    if (r.channels === 1) addNote(notes, t("meas.note.mono"));
    if (r.channels === 6) addNote(notes, t("meas.note.lfe"));
    if (lastMeasure.lossy) addNote(notes, t("meas.note.lossy"));
    if (state.std === "atsc") addNote(notes, t("info.measureNote.atsc"));
  }

  function measureFile(file) {
    var run = ++measureRun;
    lastMeasure = null;
    $("measNotes").textContent = "";
    setMeasBusy(true);
    $("measProg").removeAttribute("value");
    setMeasStatus("busy", t("meas.decoding", file.name));
    Measure.measureFile(file, function (st) {
      if (run !== measureRun) return;
      if (st.phase === "decode") {
        $("measProg").removeAttribute("value");
        setMeasStatus("busy", t("meas.decoding", file.name));
      } else {
        var pct = Math.round(st.fraction * 100);
        $("measProg").value = pct;
        setMeasStatus("busy", t("meas.analysing", file.name, pct));
      }
    }).then(function (result) {
      if (run !== measureRun) return;
      setMeasBusy(false);
      lastMeasure = { name: file.name, lossy: Measure.isLossy(file.name), result: result };
      if (result.integrated !== null) {
        $("lufsIn").value = fmt(result.integrated);
        $("tpIn").value = result.truePeak === null ? "" : fmt(result.truePeak);
        render();
      }
      showMeasureResult();
    }).catch(function (e) {
      if (run !== measureRun) return;
      setMeasBusy(false);
      var known = ["tooBig", "tooLong", "decode", "analyse", "unsupported", "read"];
      setMeasStatus("error", t("meas.err." + (known.indexOf(e && e.code) !== -1 ? e.code : "decode")));
    });
  }

  function openHelp(anchor) {
    var dlg = $("helpDlg");
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    var target = anchor ? $(anchor) : null;
    if (target && target.scrollIntoView) target.scrollIntoView();
  }

  // ---------- movable target (scale) ----------
  function targetName() {
    var s = Std.byId(state.std);
    return s ? s.name : "";
  }

  function syncLock() {
    var btn = $("lockBtn");
    btn.setAttribute("aria-checked", locked ? "true" : "false");
    btn.setAttribute("aria-label", t("scale.lock") + ": " + t(locked ? "lock.locked" : "lock.unlocked"));
    $("lockText").textContent = t(locked ? "lock.locked" : "lock.unlocked");
    $("scale").classList.toggle("scale--editable", !locked);
    $("lockHint").textContent = !locked ? t("lock.hintFree") : (state.std === "custom" ? t("lock.hintCustomLocked") : t("lock.hintLocked", targetName()));
    var mk = $("mkTarget");
    if (locked) {
      ["tabindex", "role", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-label"].forEach(function (n) { mk.removeAttribute(n); });
    } else {
      var v = readField("cTarget", LUFS_MIN, LUFS_MAX, false, true).value;
      mk.setAttribute("tabindex", "0");
      mk.setAttribute("role", "slider");
      mk.setAttribute("aria-label", t("scale.sliderLabel"));
      mk.setAttribute("aria-valuemin", String(LUFS_MIN));
      mk.setAttribute("aria-valuemax", String(LUFS_MAX));
      if (v !== null) { mk.setAttribute("aria-valuenow", String(v)); mk.setAttribute("aria-valuetext", fmt(v) + " LUFS"); }
    }
  }

  function setStandard(id) {
    state.std = id;
    save("std", id);
    locked = id !== "custom";
    $("stdSel").value = id;
    render();
    if (lastMeasure) showMeasureResult();
  }

  function onLockClick() {
    if (locked) {
      if (state.std !== "custom") {
        // hand the preset's values to Custom, so the target can be moved from where it is
        var s = Std.byId(state.std);
        $("cTarget").value = fmt(s.target);
        $("cLimit").value = s.tpLimit === null ? "" : fmt(s.tpLimit);
        save("cTarget", $("cTarget").value); save("cLimit", $("cLimit").value);
        setStandard("custom");
      } else { locked = false; render(); }
    } else { locked = true; render(); }
  }

  function setTargetFromValue(v, win) {
    var lo = Math.max(LUFS_MIN, win ? win.lo : LUFS_MIN), hi = Math.min(LUFS_MAX, win ? win.hi : LUFS_MAX);
    v = Math.min(hi, Math.max(lo, Math.round(v * 10) / 10));
    $("cTarget").value = fmt(v);
    save("cTarget", $("cTarget").value);
    render();
  }

  function valueAtPointer(e) {
    var r = $("scaleTrack").getBoundingClientRect(), w = frozenWin || scaleWin;
    return w.lo + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (w.hi - w.lo);
  }

  function initScaleDrag() {
    var track = $("scaleTrack");
    track.addEventListener("pointerdown", function (e) {
      if (locked || e.button > 0 || !scaleWin) return;
      dragging = true;
      frozenWin = { lo: scaleWin.lo, hi: scaleWin.hi, step: scaleWin.step };
      track.setPointerCapture(e.pointerId);
      setTargetFromValue(valueAtPointer(e), frozenWin);
      e.preventDefault();
    });
    track.addEventListener("pointermove", function (e) {
      if (dragging) setTargetFromValue(valueAtPointer(e), frozenWin);
    });
    function end() {
      if (!dragging) return;
      dragging = false; frozenWin = null;
      render();
      if (!locked) $("mkTarget").focus();
    }
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    $("mkTarget").addEventListener("keydown", function (e) {
      if (locked) return;
      var big = e.shiftKey ? 1 : 0.1, cur = readField("cTarget", LUFS_MIN, LUFS_MAX, false, true).value, d = 0;
      if (cur === null) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") d = -big;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") d = big;
      else if (e.key === "PageDown") d = -1;
      else if (e.key === "PageUp") d = 1;
      else return;
      e.preventDefault();
      setTargetFromValue(cur + d, null);
      $("mkTarget").focus();
    });
    $("lockBtn").addEventListener("click", onLockClick);
  }

  // ---------- install as an app ----------
  var deferredInstall = null;   // Chromium's beforeinstallprompt event, when the browser offers one

  function isInstalled() {
    if (navigator.standalone === true) return true;   // iOS home-screen app
    if (!window.matchMedia) return false;
    return ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"].some(function (m) {
      return window.matchMedia("(display-mode: " + m + ")").matches;
    });
  }
  function updateInstallButton() { $("installBtn").hidden = isInstalled(); }

  function onInstallClick() {
    if (deferredInstall) {
      var ev = deferredInstall;
      deferredInstall = null;
      ev.prompt();
      if (ev.userChoice && ev.userChoice.then) ev.userChoice.then(updateInstallButton, updateInstallButton);
    } else {
      openHelp("helpInstall");   // no native prompt (Safari, iOS, Firefox...): show the steps
    }
  }

  // ---------- wiring ----------
  function init() {
    $("ver").textContent = "v" + VERSION;
    buildLangSelect();
    $("themeSel").value = state.theme;
    $("cTarget").value = load("cTarget", "-23");
    $("cLimit").value = load("cLimit", "-1");
    applyTheme();
    applyLang();

    $("form").addEventListener("submit", function (e) { e.preventDefault(); });
    ["lufsIn", "tpIn"].forEach(function (id) { $(id).addEventListener("input", render); });
    ["cTarget", "cLimit"].forEach(function (id) {
      $(id).addEventListener("input", function () { save(id, $(id).value); render(); });
    });
    $("stdSel").addEventListener("change", function () { setStandard($("stdSel").value); });
    initScaleDrag();
    $("langSel").addEventListener("change", function () { state.lang = $("langSel").value; save("lang", state.lang); applyLang(); });
    $("themeSel").addEventListener("change", function () { state.theme = $("themeSel").value; save("theme", state.theme); applyTheme(); });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (state.theme === "auto") applyTheme(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
    }

    var dlg = $("helpDlg");
    $("helpBtn").addEventListener("click", function () { openHelp(null); });
    $("measHelp").addEventListener("click", function () { openHelp("helpLimits"); });
    $("fileBtn").addEventListener("click", function () { $("fileIn").click(); });
    var signBtns = document.querySelectorAll(".signbtn");
    Array.prototype.forEach.call(signBtns, function (b) {
      b.addEventListener("click", function () {
        var el = $(b.getAttribute("data-sign")), v = el.value.trim().replace("\u2212", "-");
        el.value = v.charAt(0) === "-" ? v.slice(1) : "-" + v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.focus();
      });
    });
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; updateInstallButton(); });
    window.addEventListener("appinstalled", function () { deferredInstall = null; updateInstallButton(); });
    $("installBtn").addEventListener("click", onInstallClick);
    updateInstallButton();
    if (window.matchMedia) {
      var dm = window.matchMedia("(display-mode: standalone)");
      if (dm.addEventListener) dm.addEventListener("change", updateInstallButton);
    }
    $("fileIn").addEventListener("change", function () {
      var f = $("fileIn").files && $("fileIn").files[0];
      $("fileIn").value = "";
      if (f) measureFile(f);
    });
    $("fileCancel").addEventListener("click", function () {
      measureRun++; Measure.cancel(); setMeasBusy(false); setMeasStatus("busy", "");
    });
    $("helpClose").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

    // Offline support: cache the app shell on first visit and offer a reload
    // when a new version has finished installing in the background.
    if ("serviceWorker" in navigator) {
      var banner = $("updateBanner");
      var reloaded = false;
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").then(function (reg) {
          reg.addEventListener("updatefound", function () {
            var installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", function () {
              if (installing.state === "installed" && navigator.serviceWorker.controller) banner.classList.remove("hidden");
            });
          });
          $("updateReload").addEventListener("click", function () {
            if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          });
          $("updateDismiss").addEventListener("click", function () { banner.classList.add("hidden"); });
        }).catch(function () { /* offline support unavailable */ });
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          if (reloaded) return;
          reloaded = true;
          location.reload();
        });
      });
    }
  }

  init();
})();
