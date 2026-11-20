# Architecture: lesson engine (hybrid voices) and user courses

Written 2026-11-20. Status: `LOOSE` until phase P0 passes. Context: [brainstorm-user-courses.md](brainstorm-user-courses.md).

## Reused as-is
- `AudioGeneration/src/curriculum/`: module/items/lesson JSON, scheduler, brief, checker, renderer. The lesson JSON stays the source of truth.
- `AudioGeneration/src/syllables/`: syllabifier, robot voice (`robot.ts`), PCM tools (`audio-io.ts`, `splitter.ts` fade/trim).
- BackOffice app: gains a "Lessons" library next to the syllable libraries.
- Firebase: Auth, Firestore, Storage, and the signed-URL Cloud Function for the player.

## New code
```
AudioGeneration/src/engine/
  voices.ts      voice per line: openai | robot (rule + per-line override)
  tts-cache.ts   neural clips cached by hash(text, model, voice, speed), shared by all courses
  render.ts      lesson JSON → timeline → PCM → loudness-matched → mp3 (+ timeline.json)
  writer.ts      brief → Claude → lesson JSON → checker → retry with errors (max 3)
  ingest.ts      RemNote/CSV export → raw cards
  clean.ts       LLM: cards → items (target, meaning, type, notes), skip report
  plan.ts        items → learn order → module.json + items.json (lesson batches)
  course.ts      CLI: deck → full course, locally (P3) and in the worker (P4)
worker/          Dockerfile (node, ffmpeg, espeak-ng) + job runner for Cloud Run
```

## Hybrid renderer (P0)
1. For each line: `say` goes to OpenAI with the narrator voice. A `target` with 2+ words goes to OpenAI with the target voice. A `target` with 1 word or a build-up piece goes to the robot. `"voice"` in the line overrides this.
2. Fetch clips (cache first), decode everything to 24 kHz mono PCM, trim edges, normalize each clip to the same loudness (−20 LUFS RMS target), add the line's `pause` as silence, and concatenate.
3. Output `lessonNN.mp3` (64–96 kbps mono) plus `lessonNN.timeline.json` (start/end/text per line, for subtitles and future on-device playback).
4. Command: `npm run lesson:render -- greek/module1 1`. It replaces the old quote-parsing `npm run generate` for curriculum lessons; the old path is shelved.

## Automated writer (P2)
- Model `claude-haiku-5-5`; escalate to `claude-sonnet-5-5` after 2 failed checks. Opus is used only by humans and agents designing the method.
- Prompt = method.md + planner rules (stable prefix, **prompt-cached**) + brief (per lesson). Output via structured outputs (lesson JSON schema).
- The loop: write → `checkLesson` → if errors, send them back as the next user turn → max 3 attempts, then status `needs-review`.
- Needs `ANTHROPIC_API_KEY` in `.env` (HIL). Log the tokens and the cost per lesson to `cost-tracker.json`.

## Data model (P4, Firestore)
```
users/{uid}                 lane: free|supporter, supporterUntil, earlyAccess (first 100), coursesThisMonth
decks/{deckId}              owner, language, fileName, itemCount, skipped, status
courses/{courseId}          owner, deckId, language, title, visibility: private|pending|public, lessonCount, minutes
courses/{id}/lessons/{n}    status: queued|writing|checking|voicing|ready|needs-review|failed,
                            audioPath, durationSec, attempts, costUsd, error
jobs/{jobId}                courseId, lesson, lane, priority, createdAt, startedAt, workerId
config/counters             earlyAccessUsed (≤100)
```

Storage:
- `courses/{courseId}/lessonNN.mp3` plus the timeline.
- `tts-cache/{lang}/{hash}.mp3`, shared, so popular phrases are voiced once.
- `decks/{deckId}.txt`, private, deleted when the course is done unless the user keeps it.

Rules:
- The owner reads their private course.
- Anyone reads public courses through the signed-URL function, which gains a `course` type.
- Only the worker (service account) writes.

## Worker (P4)
- **Cloud Run service** from `worker/Dockerfile` (espeak-ng, ffmpeg, node). It scales to zero and the free tier covers early use. A Cloud Function can't apt-install eSpeak, which is why this is Cloud Run.
- Trigger: a Firestore `onCreate(jobs/*)` Cloud Function calls the worker. The worker also polls every minute, as a safety net.
- Lanes:
  - Supporter jobs are taken first, up to 3 in parallel per user.
  - Free jobs are taken 1 at a time, with a daily cap.
  - Each lesson is one job, so users see lessons appear one by one.
- Idempotent: a job can be retried; cached clips make retries cheap.

## Player app changes (P1/P4)
- **Library:**
  - P1: reads `manifest.json` (official courses).
  - P4: adds "My courses" from Firestore once signed in.
- **Make a course** (P4): document picker → upload to Storage → create a `decks` doc → progress list from `courses/{id}/lessons`.
- **Support** (P5): opens the donation page; the supporter flag comes back via a webhook (Ko-fi/Stripe → Cloud Function → `users/{uid}.lane`).
- Auth: Firebase email link or Google sign-in. Same REST approach as BackOffice, or the SDK if it behaves.

## Decisions taken here
- Render whole mp3s on the server, not on the phone, for the MVP. It's simple for the player and works offline after download. Rendering on the device with a timeline and robot voice is a later optimization.
- Keep Firebase Storage for now; Cloudflare R2 (the earlier plan) once egress costs matter.
- One lesson per job, never a whole course per job.
