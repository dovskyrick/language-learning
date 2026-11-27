# Current architecture (2026-11-27)

What exists and runs today, pipeline by pipeline, before deploying. Plans that are not built yet are listed at the end.

## 1. Lesson text (curriculum)
Code: `AudioGeneration/src/curriculum/`. Each module has `module.json`, `items.json` and lesson JSON files. Commands: `npm run curriculum -- status | brief | check | render | approve | publish`. Greek module 1 has all 30 lessons drafted and checked.

## 2. Lesson writing, today
A human or agent writes each lesson from its brief. The checker enforces the rules, for example that build-up pieces must be word endings. There is no automated LLM writer yet; that is the planned P2.

## 3. Publish step
`publish N` marks an approved lesson as published. It no longer copies scripts to `lessons-content/`; curriculum lessons are voiced by the hybrid renderer (4b), not by `npm run generate`.

## 4. Lesson audio (OpenAI TTS)
`npm run generate` finds every `-TODO.txt` file, sends each phrase to OpenAI TTS, joins the clips with ffmpeg, uploads the mp3 to `audio-lessons/`, then renames the file `-DONE`.

## 4b. Hybrid lesson renderer (new)
`npm run lesson:render -- greek/module1 N` reads the lesson JSON directly. OpenAI voices English and phrases; MBROLA voices single words and build-up pieces. Every clip is levelled to −20 dB, pauses are kept, and the output is an mp3 plus a timeline. `all --upload` uploads them and updates the manifest.

## 5. Saving money on TTS
Repeated phrases are reused from a session cache, and known words come from the vocab library. `cost-tracker.json` logs the spend, and `--budget` stops a run at a euro limit.

## 6. Vocab library
`vocab-text/` holds the word lists and `vocab-audio/` (gitignored, backed up to Google Drive) holds one clip per word. The repair tool (`npm run repair-vocab`) finds silent or broken clips and regenerates them.

## 7. Syllable robot voice
`npm run syllables -- greek/module1` uses MBROLA gr2 through eSpeak NG to voice every build-up word, piece and syllable. It runs locally, costs nothing, uses no LLM and needs no cutting. eSpeak alone is a frozen backup (`syllables:espeak`).

## 8. Syllable upload and reviews
`syllables:upload` sends the clips and manifest to `syllable-audio/<language>/<module>/robot-mbrola/` in Storage. `syllables:reviews` pulls the BackOffice ratings into `curriculum/.../syllable-reviews.json`.

## 9. Manifest
`npm run update-manifest` scans the uploaded lessons and writes `manifest.json`, listing languages, levels and lessons with their storage paths. It uploads the file to the bucket root, where the player reads it.

## 10. Firebase Storage rules
All lesson, vocab and manifest files are closed to direct reads. Players get them only through signed URLs. `syllable-audio/` is readable by admins only, and only the service account writes anything.

## 11. Cloud Function
`getAudioUrl` (Firebase Functions v2) takes a type (manifest, lesson or vocab) and a path, validates them, rate-limits by IP, and returns a signed URL valid for one hour. `health` is a status check.

## 12. Firestore
There is one collection, `syllableReviews`, readable and writable by admins only. Everything else is denied. Admin status is a Firebase Auth custom claim, set with `npm run set-admin`.

## 13. Player app
`LanguageAudioPlayer/` is an Expo app built with EAS. It fetches the manifest through the Cloud Function, lists languages, levels and lessons, and streams each lesson with expo-av using signed URLs. There is no sign-in.

## 14. BackOffice app
`BackOffice/` is an Expo Android app for admins. It signs in with Firebase Auth, loads the MBROLA library, plays clips and build-ups, and saves ✓ ~ ✗ ratings with tags and notes to Firestore.

## 15. CI
The GitHub workflow "BackOffice APK" type-checks and builds a release APK on pushes that touch `BackOffice/`, and uploads it as a downloadable artifact. Nothing else runs in CI: no tests and no deploys.

## 16. Secrets and config
`AudioGeneration/.env` holds the OpenAI key, and `firebase-service-account.json` holds the admin credentials. Both are gitignored. The Firebase web API key is public by design, so access depends on the rules above.

## 17. Known gaps before deploy
App Check is not finished, so the Cloud Function is open to any client within the rate limit. No automated tests run in CI.

## 18. Planned, not built
Planned: an automated Claude lesson writer, user courses from RemNote decks, and a Cloud Run worker. Details: `company/product/architecture-lesson-engine.md`.
