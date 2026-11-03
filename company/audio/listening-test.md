# Listening test: lessons 1, 10, 30 and syllable tricks

## Why it can't run in the cloud session yet
The Claude cloud session has no `OPENAI_API_KEY`, and its network policy blocks `api.openai.com`. Pick one fix:
- **Local (fastest):** run the steps below on your computer, where `.env` and `firebase-service-account.json` already exist.
- **Cloud:** in the environment settings (cloud environment menu, then Edit), add `OPENAI_API_KEY` as a secret or environment variable, add `api.openai.com` under Allowed domains (keep "Allow package managers" ticked), and start a new session.

## Steps
```bash
cd AudioGeneration
git pull
npm install
npm run syllable-test      # ~60 small files in output/syllable-test/, < $0.05
npm run generate           # voices lessons-content/greek/module1/lesson01, 10, 30 (TODO files), ~$1, uploads to Firebase
```
Lessons 1, 10 and 30 are already approved and published as `lessons-content/greek/module1/lessonNN-TODO.txt`.

## Score sheet (0 = bad, 1 = usable, 2 = good)

**Whole lessons**

| | Greek accent | English voice | Pause lengths | Build-up pieces | Notes |
|---|---|---|---|---|---|
| Lesson 1 | | | | | |
| Lesson 10 | | | | | |
| Lesson 30 | | | | | |

**Syllable tricks.** The test words are ευχαριστώ, παρακαλώ, Θεσσαλονίκη, καλημέρα, εστιατόριο and Δευτέρα. Variants 01–10 are listed in `AudioGeneration/src/syllable-test.ts`.

| Variant | Words scoring 2 | Notes |
|---|---|---|
| 02-hyphen | /6 | |
| 03-hyphen-slow | /6 | |
| 05-dots | /6 | |
| 06-endings (closest to the lessons) | /6 | |
| 08-4o-instructed | /6 | |
| 09-4o-hyphen-instructed | /6 | |
| 10-4o-endings | /6 | |

Gate rule: if any variant scores 2 on at least 5 of 6 words, that is the winner. Hyphen variants (02, 03, 04, 09) are the Plan A candidates: also check by eye that there are clear silences between syllables (any waveform viewer). See [roadmap-syllables.md](roadmap-syllables.md).
