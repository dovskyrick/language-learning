# Proposal: integration testing (2026-11-27)

Status: `LOOSE`, waiting for your OK. Nothing is built yet. Each subtopic is about 50 words.

## What "integration test" means here
A unit test checks one function alone, such as the syllabifier. An integration test checks that two or more real pieces work together: renderer plus ffmpeg, Cloud Function plus Storage rules, player plus signed URL. These tests are slower, so we keep few of them.

## 1. Audio pipeline smoke test
Render one tiny fake lesson (three lines) with OpenAI mocked by a fixed mp3 and the real MBROLA and ffmpeg. Assert that the mp3 exists, its duration is roughly expected, no clip is silent, and the loudness is similar across clips. It runs locally in about 10 seconds and costs $0.

## 2. Firebase emulator test
Use the Firebase Local Emulator Suite: Storage, Firestore and Functions running on your PC, with no real project touched. Upload a fake lesson, call `getAudioUrl`, and check that a signed URL comes back. Then check that a direct unauthenticated read is denied and that the rate limit triggers. This proves the rules without risk.

## 3. Manifest contract test
The pipeline writes `manifest.json` and the player reads it. One shared TypeScript type and one test make sure that every `storagePath` in the manifest points to a file that was actually uploaded. This catches the most likely real bug: a lesson listed in the app that does not exist.

## 4. Player unit tests (agreed scope)
Jest with React Native Testing Library, on logic only: time formatting, seek and skip math, end-of-lesson handling, and directory navigation. Mock expo-av instead of playing real audio. These are fast and stable and protect the "smooth player" goal directly.

## 5. What I would not do
No end-to-end device tests (Detox or Maestro) yet: they are slow, flaky and need emulators in CI. No tests against the real Firebase project, and no paid OpenAI calls in tests. Revisit these after release, if bugs show up that the cheaper tests miss.

## 6. CI shape
One GitHub workflow, triggered on pull requests. It runs unit tests for AudioGeneration and the player, the smoke test with OpenAI mocked, and the emulator test. Target under 5 minutes in total. The BackOffice APK workflow stays as it is. Deploys stay manual for now.

## 7. Order and effort
Player unit tests first (half a day), then the manifest contract test (an hour), the smoke test (half a day), the emulator test (half a day) and finally CI wiring (an hour). Each step is a separate prompt and commit, so you can stop at any point.
