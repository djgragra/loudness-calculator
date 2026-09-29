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
- **Measure from a file**: if you don't know the values, load an audio file; loudness and true peak are measured in the browser and copied into the fields.

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

## Measuring a file (how it works, sources, limits)

The measurement runs entirely in the browser (Web Audio decoding + a Web Worker). The file is never uploaded.

- **Method**: own implementation of [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770) (checked against revision 5, 11/2023): K-weighting, 400 ms blocks with 75 % overlap, gating at −70 LUFS and −10 LU below the average, channel weights 1.0 / 1.41, LFE excluded. True peak by 4× oversampling (windowed-sinc interpolator).
- **Whole programme only**: no dialogue gating (ATSC A/85 long-form content is defined on dialogue level) and no loudness range.
- **Validation**: (1) K-weighting coefficients equal the published 48 kHz values, and the algorithm parameters were checked against the BS.1770-5 text. (2) `node --test dev/*.test.js`: [EBU Tech 3341](https://tech.ebu.ch/docs/tech/tech3341.pdf) cases 1–6 and 15–19 synthesised at 48 kHz. (3) `node dev/validate-ebu.js <folder>` on the official [EBU loudness test set v5.0](https://tech.ebu.ch/publications/ebu_loudness_test_set) (not included in this repo, see EBU Terms of Use): all 18 integrated-loudness and true-peak cases (1–8 and 15–23) are within the accepted tolerances (±0.1 LU; +0.2/−0.4 dB). Largest deviations: +0.05 LU on loudness, −0.15 dB on true peak (cases 20–23). Short-term and momentary cases (9–14) are not implemented. This is not a certified meter: use a certified one for contractual deliveries.
- **Decoding**: done by the browser. The original sample rate is sniffed from the file header (WAV, FLAC, Ogg, MP3, MP4) so the browser decodes without resampling; when detection fails or the rate is not supported, the app shows a note. Lossy files give a decoder-dependent true peak.
- **Channels**: mono, stereo, 3, 5.0 and 5.1 (order L R C LFE Ls Rs) are recognised; other layouts are counted with equal weight and the app says so.
- **Limits**: 800 MB and 90 minutes per file.

## Run locally

Static files, no build step. Serve the folder with any web server (service workers need `http://localhost` or HTTPS):

```bash
python3 -m http.server 8123
```

Tests (Node 18+): `node --test dev/*.test.js`

## Structure

- `index.html`, `style.css`, `fonts.css`, `app.js`, `calc.js`, `standards.js`, `i18n.js`, `analyzer.js`, `analyzer-worker.js`, `measure.js`, `sw.js`, `manifest.json`, `icons/`, `fonts/` — the app (served under `/apps/loudness-calculator/`).
- `dev/` — tests and the icon generator; not deployed.

Static-app constraints: relative paths only, strict CSP (no inline scripts or styles), service worker scoped to the app folder. Bump `CACHE_VERSION` in `sw.js` and `VERSION` in `app.js` on every release. Versions are `year.month.number` (e.g. `2026.9.2`), tags `v2026.9.2`, as in the other OnAir Garage apps.

## Credits

Fonts (SIL Open Font License 1.1, see `fonts/OFL-*.txt`): Barlow Condensed, Share Tech Mono.
