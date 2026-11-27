# Audio player assessment (2026-11-27)

Code: `LanguageAudioPlayer/`, about 1,200 lines. **Eloquence: 5/10.** It works and is readable, but playback timing is fragile. Each subtopic is about 15 words.

## Good
- **Structure:** two screens, one audio service and one Firebase service. Clear, small and easy to follow.
- **Security:** signed URLs through the Cloud Function, with no direct Storage access. A clean backend contract.
- **Types:** the Manifest, Language, Level and Lesson types are simple and match `manifest.json` exactly.

## Weak
- **Fake clock:** the slider counts time with `setInterval` instead of trusting the player. It drifts after pauses and buffering.
- **Seek on pause:** every pause or resume seeks to the UI time, which adds lag and audible jumps.
- **Effect churn:** the timer effect depends on `currentTime`, so the interval is rebuilt every 100 ms.
- **expo-av:** it is deprecated in Expo SDK 54. `expo-audio` replaces it and is the safer long-term choice.
- **No lock screen:** there are no notification or lock-screen controls, which a 30-minute audio lesson needs.
- **No memory:** there is no resume position, no "lesson done" mark and no last-played lesson.
- **URL expiry:** signed URLs last one hour, so a long pause could break streaming or seeking.
- **Hand-made navigation:** the directory fakes three screens with state, so the Android back button can misbehave.
- **Dead code:** `firebaseConfig.ts` and the firebase SDK are unused, because everything goes through `fetch`.
- **Noise:** console logs with emojis everywhere. Fine for debugging, but strip them for release.
- **No tests:** zero tests, so the playback math is the first thing to cover.

## Verdict
- Keep the services and types. A rewrite of PlayerScreen around expo-audio's real status would fix most issues.
