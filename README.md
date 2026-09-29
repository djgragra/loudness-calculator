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
- A **scale** with input, target (and tolerance band) and result. The scale is centred on the target and works like a wheel: drag it left/right (mouse wheel and arrow keys work too) to change the target. It is locked while a preset standard is selected; the lock switch unlocks it and switches to Custom, and choosing Custom unlocks it automatically. Markers outside the visible range stick to the edge with an arrow and their value.
- **Platform playback**: the gain a streaming platform would apply to your file as it is.
- A custom target / true-peak limit for house or client specs.
- **Measure from a file**: if you don't know the values, load an audio file; loudness and true peak are measured in the browser and copied into the fields.

Languages: English, Italiano, Español. The app always opens in English; a manual change is remembered on the device. Theme: light, dark, or follow the system. Choices are stored only on the device (`localStorage`). No data leaves the browser; fonts are served locally.

**Install as an app** (computer, phone, tablet): "Install app" button at the top (Chrome, Edge and other Chromium browsers); on iPhone/iPad use Share → Add to Home Screen; on Safari for Mac use File → Add to Dock. Once installed it works offline and shows an "update available" banner when a new version is ready. The instructions are also in the in-app help.

Phone use: loudness fields accept a value without the minus sign (`18.4` counts as −18.4, since loudness is never positive) and every numeric field has a ± button, because phone keypads often lack a minus key.

## Standards and values

Checked September 2026. "Official" = read from the primary document. "Recommended" = no official documentation found; a common-practice suggestion only, and the app says so.

| Standard | Target | Tolerance | True-peak limit | Status | Source |
|---|---|---|---|---|---|
| EBU R 128 | −23.0 LUFS | ±1.0 LU where the target is not practically achievable (e.g. live); ±0.2 LU in QC | −1 dBTP in production (measurement tolerance ±0.3 dB) | Official | [EBU R 128 v5 (Nov 2023)](https://tech.ebu.ch/docs/r/r128.pdf), recommendations h), i), m) |
| ATSC A/85 | −24 LKFS (no metadata, no other agreement) | about ±2 dB | below −2 dBTP, meter tolerance about ±0.5 dB, measured before encoding | Official | [ATSC A/85:2026-07](https://www.atsc.org/wp-content/uploads/2026/07/A85-2026-07.pdf), sect. 6 and Table M.1 |
| Spotify | −14 LUFS | — | −1 dBTP (lossy); −2 dBTP if louder than −14 LUFS | Official | [Spotify Support](https://support.spotify.com/us/artists/article/loudness-normalization/) |
| Apple Podcasts | −16 LKFS | ±1 dB | −1 dB FS (true peak) | Official | [Apple Podcasts for Creators, audio requirements](https://podcasters.apple.com/support/893-audio-requirements) (BS.1770-5) |
| BBC | −23 LUFS | ±1 LU | −1 dBTP | Recommended | EBU R 128 values; BBC delivery specification not read |
| YouTube | −14 LUFS | — | −1 dBTP | Recommended | No official value found |
| Apple Music | −16 LUFS | — | −1 dBTP | Recommended | No official value found (Apple's podcast page mentions −16 dB Sound Check playback) |
| Amazon Music | −14 LUFS | — | −2 dBTP | Recommended | No official document found |

Notes:

- LUFS and LKFS are the same unit (ITU-R BS.1770).
- **ATSC measurement method**: A/85 defines long-form loudness as *integrated dialogue loudness* (dialogue-gated, BS.1770-1 without the relative gate); only short-form content uses full-programme loudness. The app measures full-programme loudness, so for ATSC long-form content enter a value from a dialogue-gating meter. The app says so in the ATSC info panel and in the measurement notes. A/85:2026 also recommends a single target between −23 and −27 LKFS for streaming services (not used by the app).
- EBU R 128 v5 lists ±0.5 LU only in its revision history (v3, 2014); the current text gives ±1.0 LU where the target is not practically achievable, and ±0.2 LU as a quality-control tolerance. The app shows ±1.0 LU.
- Playback behaviour: Spotify raises quiet files (keeping 1 dB headroom for lossy) and lowers loud ones (official; the app's headroom limit is an estimate, the page does not say whether it counts sample or true peak). YouTube, Apple Music and Amazon Music are reported to only lower loud files; this is not officially documented, and the app labels it so.
- Comparisons are made at the 0.1 dB resolution meters display.

## Measuring a file (how it works, sources, limits)

The measurement runs entirely in the browser (Web Audio decoding + a Web Worker). The file is never uploaded.

- **Method**: own implementation of [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770) (checked against revision 5, 11/2023): K-weighting, 400 ms blocks with 75 % overlap, gating at −70 LUFS and −10 LU below the average, channel weights 1.0 / 1.41, LFE excluded. True peak by oversampling (windowed-sinc interpolator): 4× below 96 kHz, 2× from 96 kHz, none from 192 kHz.
- **Whole programme only**: no dialogue gating and no loudness range.
- **Decoding**: done by the browser. The original sample rate is sniffed from the file header (WAV, FLAC, Ogg, MP3, MP4) so the browser decodes without resampling; when detection fails or the rate is not supported, the app shows a note. Lossy files give a decoder-dependent true peak.
- **Channels**: mono, stereo, 3, 5.0 and 5.1 (order L R C LFE Ls Rs) are recognised; other layouts are counted with equal weight and the app says so.
- **Limits**: 800 MB and 90 minutes per file.

## Validation and references

The measurement is checked against these references (results as of September 2026). This is **not a certified meter**: use a certified one for contractual deliveries.

| Reference | What it validates | Result | How to re-run |
|---|---|---|---|
| [ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770) | K-weighting coefficients (48 kHz), −0.691 offset, channel weights, 400 ms / 75 % blocks, −70 LUFS and −10 LU gates | identical to the text | `node --test dev/*.test.js` |
| [EBU Tech 3341](https://tech.ebu.ch/docs/tech/tech3341.pdf) test signals, synthesised | loudness (cases 1–6), gating, 5.0 channels, true peak (15–19) | within tolerance | `node --test dev/*.test.js` |
| [EBU loudness test set v5.0](https://tech.ebu.ch/publications/ebu_loudness_test_set) (official files) | all 18 cases with a loudness or true-peak expectation (1–8, 15–23) | all within ±0.1 LU and +0.2/−0.4 dB; largest deviations +0.05 LU and −0.15 dB | `node dev/validate-ebu.js <folder>` (files not in this repo: EBU Terms of Use) |
| ffmpeg `ebur128` filter (independent implementation) | authentic programmes at 32, 44.1, 48 and 96 kHz, 5.0 channels | within 0.03 LU and 0.04 dB | `node dev/crosscheck-ffmpeg.js <files>` |
| Sample rates 8 kHz – 192 kHz | K-weighting re-derived at other rates | 1 kHz tone within ±0.1 LU at every rate | `node --test dev/*.test.js` |

Not validated because not implemented: short-term and momentary loudness (Tech 3341 cases 9–14), loudness range (Tech 3342), dialogue gating.

## Sources to re-check

Values and methods depend on documents that get revised. Last read on 2026-09-29:

| Document | Version read | Where |
|---|---|---|
| EBU R 128 | v5, November 2023 | https://tech.ebu.ch/docs/r/r128.pdf |
| ITU-R BS.1770 | revision 5, November 2023 | https://www.itu.int/rec/R-REC-BS.1770 |
| EBU Tech 3341 | 2023 edition | https://tech.ebu.ch/docs/tech/tech3341.pdf |
| EBU loudness test set | v5.0, 30 March 2016 | https://tech.ebu.ch/publications/ebu_loudness_test_set |
| ATSC A/85 | 2026-07 (8 July 2026); the previous edition was 2013 | https://www.atsc.org/wp-content/uploads/2026/07/A85-2026-07.pdf |
| Apple Podcasts audio requirements | web page | https://podcasters.apple.com/support/893-audio-requirements |
| Spotify loudness normalisation | web page | https://support.spotify.com/us/artists/article/loudness-normalization/ |

Not verifiable with a primary source (values are recommendations): YouTube, Apple Music, Amazon Music, BBC delivery specification.

## Run locally

Static files, no build step. Serve the folder with any web server (service workers need `http://localhost` or HTTPS):

```bash
python3 -m http.server 8123
```

Tests (Node 18+): `node --test dev/*.test.js`

## Structure

- `index.html`, `style.css`, `fonts.css`, `app.js`, `calc.js`, `standards.js`, `i18n.js`, `analyzer.js`, `analyzer-worker.js`, `measure.js`, `sw.js`, `manifest.json`, `icons/`, `fonts/` — the app (served under `/apps/loudness-calculator/`).
- `dev/` — tests, validation scripts and the icon generator; not deployed.

Static-app constraints: relative paths only, strict CSP (no inline scripts or styles), service worker scoped to the app folder. Bump `CACHE_VERSION` in `sw.js` and `VERSION` in `app.js` on every release. Versions are `year.month.number` (e.g. `2026.9.5`), tags `v2026.9.5`, as in the other OnAir Garage apps.

## Credits

Fonts (SIL Open Font License 1.1, see `fonts/OFL-*.txt`): Barlow Condensed, Share Tech Mono.
