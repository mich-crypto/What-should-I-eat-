// Single source of truth for the app version shown in Settings.
//
// Bump this on every deploy. It's also mirrored in the CACHE_VERSION
// constant at the top of sw.js — changing that string is what makes the
// service worker treat a deploy as an update (new cache name -> old cache
// dropped -> already-open tabs get the new files automatically, see the
// registration script in index.html).
export const VERSION = "1.5.0";
export const BUILD_DATE = "2026-09-15";
