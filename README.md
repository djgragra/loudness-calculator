# Loudness Target Calculator

Gain in dB to bring a file to a loudness target, with a true-peak check. Free, offline-capable web app (PWA) from [OnAir Garage](https://onairgarage.com).

- Tool page: https://onairgarage.com/tools/loudness-calculator/
- Web app: https://onairgarage.com/apps/loudness-calculator/
- Author: Graziano Melzi · OnAir Garage — hello@onairgarage.com
- License: MIT (see `LICENSE`)

## What it does

Enter the integrated loudness of a file (LUFS, from any ITU-R BS.1770 meter), optionally its true peak (dBTP), and pick a target standard. The app shows:

- **Gain to apply** = target − measured loudness (dB).
- **Resulting loudness** and **resulting true peak** (measured true peak + gain).
- A **warning** if the gain pushes the true peak over the standard's limit, with the highest gain you can apply without a limiter.
- A **scale** with input, target (and tolerance band) and result.
- **Platform playback**: the gain a streaming platform would apply to your file as it is.
- A custom target / true-peak limit for house or client specs.

Languages: English (default), Italiano, Español. Theme: light, dark, or follow the system. Choices are stored only on the device (`localStorage`). No data leaves the browser; fonts are served locally.

## Standards and values

Checked September 2026. "Official" = read from the primary document. "Recommended" = no official documentation found; a common-practice suggestion only, and the app says so.

| Standard | Target | Tolerance | True-peak limit | Status | Source |
|---|---|---|---|---|---|
| EBU R 128 | −23.0 LUFS | ±1.0 LU where the target is not practically achievable (e.g. live) | −1 dBTP (production) | Official | [EBU R 128 v5 (Nov 2023)](https://tech.ebu.ch/docs/r/r128.pdf), recommendations h), m) |
| ATSC A/85 | −24 LKFS | about ±2 dB | below −2 dB TP (recommendation) | Official | [ATSC A/85:2013](https://www.atsc.org/wp-content/uploads/2015/03/Techniques-for-establishing-and-maintaining-audio-loudness.pdf), sect. 6, Annex I |
| Spotify | −14 LUFS | — | −1 dBTP (lossy); −2 dBTP if louder than −14 LUFS | Official | [Spotify Support](https://support.spotify.com/us/artists/article/loudness-normalization/) |
| BBC | −23 LUFS | ±1 LU | −1 dBTP | Recommended | EBU R 128 values; BBC specification not read |
| YouTube | −14 LUFS | — | −1 dBTP | Recommended | No official value found |
| Apple Music | −16 LUFS | — | −1 dBTP | Recommended | No official value found |
| Amazon Music | −14 LUFS | — | −2 dBTP | Recommended | No official document found |
| Podcast | −16 LUFS | — | −1 dBTP | Recommended | Industry convention |

Notes:

- LUFS and LKFS are the same unit (ITU-R BS.1770).
- The ATSC value comes from the 2013 edition; a newer A/85 revision exists and was not read.
- EBU R 128 v5 lists ±0.5 LU only in its revision history (v3, 2014); the current text gives ±1.0 LU where the target is not practically achievable, and ±0.2 LU as a quality-control measurement tolerance. The app shows ±1.0 LU.
- Playback behaviour: Spotify raises quiet files (keeping 1 dB headroom for lossy) and lowers loud ones (official). YouTube, Apple Music and Amazon Music are reported to only lower loud files; this is not officially documented, and the app labels it so.

## Run locally

Static files, no build step. Serve the folder with any web server (service workers need `http://localhost` or HTTPS):

```bash
python3 -m http.server 8123
```

Tests (Node 18+): `node --test dev/calc.test.js`

## Structure

- `index.html`, `style.css`, `fonts.css`, `app.js`, `calc.js`, `standards.js`, `i18n.js`, `sw.js`, `manifest.json`, `icons/`, `fonts/` — the app (served under `/apps/loudness-calculator/`).
- `dev/` — tests and the icon generator; not deployed.

Static-app constraints: relative paths only, strict CSP (no inline scripts or styles), service worker scoped to the app folder. Bump `CACHE_VERSION` in `sw.js` on every release.

## Credits

Fonts (SIL Open Font License 1.1, see `fonts/OFL-*.txt`): Barlow Condensed, Share Tech Mono.
