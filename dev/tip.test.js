"use strict";
// The tip box (the jar of onairgarage.com, one line, a pill): texts in the three languages,
// the support page in the language of the app, the jar available offline, and the release
// numbers (app, service worker, footer) kept together.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../i18n.js");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("tip box texts exist in English, Italian and Spanish", () => {
  for (const lang of I18n.langs) {
    for (const key of ["tip.line", "tip.btn", "tip.url"]) {
      const v = I18n.strings[lang][key];
      assert.ok(typeof v === "string" && v.length > 3, `${lang} ${key}`);
    }
  }
  assert.equal(I18n.strings.en["tip.btn"], "Tip jar");
  assert.equal(I18n.strings.it["tip.btn"], "Salvadanaio");
  assert.equal(I18n.strings.es["tip.btn"], "Hucha");
});

test("the tip link goes to the support page in the language of the app and nowhere else", () => {
  assert.equal(I18n.t("en", "tip.url"), "https://onairgarage.com/support/");
  assert.equal(I18n.t("it", "tip.url"), "https://onairgarage.com/it/support/");
  assert.equal(I18n.t("es", "tip.url"), "https://onairgarage.com/es/support/");
});

test("the markup: jar as a second link (hidden from keyboards and screen readers), pill, new tab", () => {
  const html = read("index.html");
  const art = html.match(/<a class="tip-box__art"[^>]*>/)[0];
  assert.match(art, /tabindex="-1"/);
  assert.match(art, /aria-hidden="true"/);
  assert.match(art, /target="_blank"/);
  assert.match(art, /rel="noopener"/);
  const btn = html.match(/<a class="tip-box__btn"[^>]*>/)[0];
  assert.match(btn, /target="_blank"/);
  assert.match(btn, /rel="noopener"/);
  assert.match(html, /<img src="icons\/tip-jar\.webp" alt=""/);
  assert.match(read("app.js"), /\$\("tipBtn"\)\.href = t\("tip\.url"\)/);
});

test("the jar exists and is in the offline cache", () => {
  assert.ok(fs.statSync(path.join(root, "icons/tip-jar.webp")).size > 1000);
  assert.match(read("sw.js"), /"\.\/icons\/tip-jar\.webp"/);
});

test("version, cache version and footer say the same release", () => {
  const v = read("app.js").match(/var VERSION = "([^"]+)"/)[1];
  assert.equal(read("sw.js").match(/const CACHE_VERSION = "v([^"]+)"/)[1], v);
  assert.match(read("index.html"), new RegExp(`<span id="ver">v${v.replace(/\./g, "\\.")}</span>`));
});

test("the manifest is valid and every file it names exists", () => {
  const m = JSON.parse(read("manifest.json"));
  const files = [...m.icons, ...(m.screenshots || [])].map((i) => i.src);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), f);
  const shots = m.screenshots || [];
  assert.ok(shots.some((s) => s.form_factor === "wide"), "a wide screenshot");
  assert.ok(shots.some((s) => s.form_factor === "narrow"), "a narrow screenshot");
});
