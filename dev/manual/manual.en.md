# Loudness Target Calculator manual

The Loudness Target Calculator tells you the **gain in dB** needed to bring a file to a loudness target, with a **true-peak check**. It is a free web app (PWA) from OnAir Garage that works offline after the first visit and measures files in your browser: nothing is uploaded.

## Open and install

Open the calculator at `https://onairgarage.com/apps/loudness-calculator/` (the tool page is `https://onairgarage.com/tools/loudness-calculator/`). Nothing is installed to use it. You can also install it as an app:

- **Chrome, Edge and other Chromium browsers**: press the *Install app* button at the top.
- **iPhone and iPad (Safari)**: tap the Share button, then "Add to Home Screen".
- **Safari on Mac**: File menu, then "Add to Dock".

Once installed it works offline. The app always opens in English; change the language in the header (English, Italiano, Español) and the choice is remembered on the device. The theme can be light, dark or follow the system.

## Using the calculator

1. Enter the **Integrated loudness** of the file in LUFS, as measured by any ITU-R BS.1770 meter (a value between −70 and 0). On a phone you can type it without the minus sign: `18.4` counts as −18.4, since loudness is never positive.
2. Optionally enter the **True peak** in dBTP (between −70 and +12). Use the ± button to change the sign.
3. Choose the **Target standard** from the list (Broadcast, Streaming, Podcast, Other), or **Custom…** to give your own **Custom target** and **Custom true-peak limit** (leave the limit empty for no limit).
4. Read the result. The big figure is the **Gain to apply** = target − measured loudness, in dB. Below it you see the **Input**, the **Target**, the **Result** loudness and the **Result true peak** (the measured true peak plus the gain).

If the gain pushes the true peak over the limit of the standard, a **warning** appears ("True peak over the limit") together with the highest gain you can apply without a limiter. If the file is already within the tolerance of the standard, the gain is optional, and if you did not enter the true peak the clipping check is skipped.

## The scale

The scale shows the **IN** (measured), the **TARGET** with its tolerance band, the **OUT** (result after the gain) and the **MAX** (the highest loudness reachable under the peak limit). It is centred on the target and works like a wheel: drag it left or right (the mouse wheel and the arrow keys work too) to change the target. It is locked while a preset standard is selected; the lock switch unlocks it and switches to Custom, and choosing Custom unlocks it automatically. Markers outside the visible range stick to the edge with an arrow and their value.

## Measure from a file

If you do not know the values, press **Measure from a file** and choose an audio file. The loudness and the true peak are measured **in your browser** (the file never leaves your computer) and copied into the fields. The measurement is the whole-programme loudness (ITU-R BS.1770) without dialogue gating; the limits are 800 MB and 90 minutes, and *Method, sources and limits* explains the details.

## Standards and values

The table lists the targets built in. "Official" means read from the primary document; "Recommended" means no official documentation was found, a common-practice suggestion only, and the app says so. Checked in September 2026.

| Standard | Target | Tolerance | True-peak limit | Status |
|---|---|---|---|---|
| EBU R 128 | −23.0 LUFS | ±1.0 LU where the target is not practically achievable (for example live); ±0.2 LU in QC | −1 dBTP in production | Official |
| ATSC A/85 | −24 LKFS (no metadata, no other agreement) | about ±2 dB | below −2 dBTP, measured before encoding | Official |
| Spotify | −14 LUFS | — | −1 dBTP (lossy); −2 dBTP if louder than −14 LUFS | Official |
| Apple Podcasts | −16 LKFS | ±1 dB | −1 dB FS (true peak) | Official |
| BBC | −23 LUFS | ±1 LU | −1 dBTP | Recommended |
| YouTube | −14 LUFS | — | −1 dBTP | Recommended |
| Apple Music | −16 LUFS | — | −1 dBTP | Recommended |
| Amazon Music | −14 LUFS | — | −2 dBTP | Recommended |

**Platform playback** shows the gain a streaming platform would apply to your file as it is; where the behaviour is not officially documented the app says so. A custom target is your own value: nothing is checked against a published document.

## Language and privacy

Choices (language, theme) are stored only on the device. No data leaves the browser and the fonts are served locally. A small tip card at the bottom of the page has the jar of the site and a button that opens the tip page of onairgarage.com in your language in a new tab; it is the only place, and nothing is asked inside the calculator.

## Updates

The app updates itself: when a new version is ready a banner offers to reload. Ignoring it just keeps the current version running.

## Limits

- This is not a certified meter or tool: the measurement from a file is a whole-programme loudness without dialogue gating, so always confirm important deliveries with your own BS.1770 meter.
- The true-peak value of a file you measure here is computed in the browser; for a delivery use the figures of your meter.
- The values of the "Recommended" standards are common-practice suggestions, not published requirements.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Enter a value between −70 and 0 LUFS." | The integrated loudness is never positive: check the value (a bare `18.4` counts as −18.4). |
| The measurement failed | Try a shorter file (up to 90 minutes, 800 MB) or another browser; Web Audio and Web Workers are needed. |
| The *Install app* button is not there | The browser may not offer it: on iPhone, iPad and Safari for Mac use the steps in the Open and install chapter. |
| The scale does not move | A preset standard locks it: unlock it with the lock switch, which switches to Custom. |

## Contacts

Graziano Melzi · OnAir Garage — `https://onairgarage.com` — `hello@onairgarage.com`. Tool page: `https://onairgarage.com/tools/loudness-calculator/`. Source code and releases: `https://github.com/djgragra/loudness-calculator`. Licence: MIT © 2026 Graziano Melzi.
