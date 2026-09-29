/* Loudness Target Calculator — standards and target values.
   © 2026 Graziano Melzi · OnAir Garage — MIT License

   status "official"    : value read from the primary document (see source).
   status "recommended" : no official documentation found; the value is a
                          common-practice suggestion only (shown as such in the UI).
   Values checked September 2026. LUFS and LKFS are the same measure
   (ITU-R BS.1770); "dBTP" and "dB TP" are both true peak.

   playback: how the platform normalises at playback (streaming only).
     mode "down" / "updown" / "none"; headroomTp = ceiling kept when turning up. */
(function (root) {
  "use strict";

  var STANDARDS = [
    {
      id: "ebu", group: "broadcast", name: "EBU R 128",
      target: -23, tolerance: 1, tpLimit: -1, status: "official",
      source: { label: "EBU R 128 (v5, Nov 2023)", url: "https://tech.ebu.ch/docs/r/r128.pdf" }
    },
    {
      id: "atsc", group: "broadcast", name: "ATSC A/85",
      target: -24, tolerance: 2, tpLimit: -2, status: "official",
      source: { label: "ATSC A/85:2013", url: "https://www.atsc.org/wp-content/uploads/2015/03/Techniques-for-establishing-and-maintaining-audio-loudness.pdf" }
    },
    {
      id: "bbc", group: "broadcast", name: "BBC",
      target: -23, tolerance: 1, tpLimit: -1, status: "recommended", source: null
    },
    {
      id: "spotify", group: "streaming", name: "Spotify",
      target: -14, tolerance: null, tpLimit: -1, status: "official",
      source: { label: "Spotify Support", url: "https://support.spotify.com/us/artists/article/loudness-normalization/" },
      playback: { mode: "updown", headroomTp: -1 }
    },
    {
      id: "youtube", group: "streaming", name: "YouTube",
      target: -14, tolerance: null, tpLimit: -1, status: "recommended", source: null,
      playback: { mode: "down" }
    },
    {
      id: "apple", group: "streaming", name: "Apple Music",
      target: -16, tolerance: null, tpLimit: -1, status: "recommended", source: null,
      playback: { mode: "down" }
    },
    {
      id: "amazon", group: "streaming", name: "Amazon Music",
      target: -14, tolerance: null, tpLimit: -2, status: "recommended", source: null,
      playback: { mode: "down" }
    },
    {
      id: "podcast", group: "podcast", name: "Podcast",
      target: -16, tolerance: null, tpLimit: -1, status: "recommended", source: null
    }
  ];

  var api = {
    list: STANDARDS,
    byId: function (id) {
      for (var i = 0; i < STANDARDS.length; i++) if (STANDARDS[i].id === id) return STANDARDS[i];
      return null;
    }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LoudnessStandards = api;
})(typeof self !== "undefined" ? self : this);
