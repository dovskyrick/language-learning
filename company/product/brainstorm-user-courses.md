# Brainstorm: the product, a lesson library that grows from users' vocab

Written 2026-11-20, after the robot-voice MVP. Status: `LOOSE`. Architecture: [architecture-lesson-engine.md](architecture-lesson-engine.md). Plan: [roadmap-product.md](roadmap-product.md). For the human: `HIL-log/TODO-product-kickoff-nov-23.md`.

## 1. What the user sees (minimal on purpose)
Three screens, nothing else:
1. **Library:** courses, then lessons, then play. Official courses first, then "My courses".
2. **Player:** the one we have.
3. **Make a course:** pick a RemNote export, check the language, press *Generate*, and lessons appear as they finish.

There is one **Support** button. No settings maze, no streaks, no gamification for now. Sign-in is only needed for "My courses" and supporter status, never for listening to the public library.

## 2. Growing the library: four sources
| Source | Who makes it | Visibility |
|---|---|---|
| Official modules (Greek M1, then M2…) | us, via the existing curriculum pipeline + BackOffice review | public |
| User decks → private course | the user, by upload | private by default |
| User courses shared to the library | the user opts in, then an automated check plus a quick human review in BackOffice | public |
| Remixes: a popular public course regenerated with new themes | us or users | public |

Each course people share makes the free library bigger for everyone. That is the Anna's-Archive spirit: donors fund the machine, and everyone benefits.

## 3. The pipeline in one line
RemNote export → **parse** → **clean items** (LLM) → **learn order + lesson batches** (planner) → **lesson text** (LLM writer + our checker) → **voice** (OpenAI for sentences, robot for words and syllables) → **stitch** to one mp3 per lesson → library.

All the steps up to the voicing are text, so they are cheap, inspectable and re-runnable. That matches your proposal and reuses everything we built: `items.json`, `module.json`, the scheduler, the checker and the BackOffice.

## 4. Voices: the hybrid rule
| Line | Voice | Why |
|---|---|---|
| English narrator ("How do you say…") | OpenAI | natural, long text, reliable |
| Target-language sentences (2+ words) | OpenAI | natural prosody; long enough to be stable |
| Single words, build-up pieces, syllables | **robot (eSpeak NG)** | the short inputs neural TTS fails on; free, deterministic |

The rule is set per line and can be overridden in the lesson JSON (`"voice": "robot"`). Loudness is matched across the two voices when stitching.

## 5. Cost per lesson (Nov 2026 prices)
- **Lesson text:** about 15k input and 12k output tokens, ×2 with one checker retry. Haiku 5.5 ($0.10/$0.50 per M) ≈ **$0.015**. Escalating to Sonnet 5.5 ($2/$10) if Haiku fails twice ≈ $0.30, which should be rare.
- **Neural TTS:** about 2,700 characters per lesson at tts-1's $15 per M ≈ **$0.04**. It gets cheaper as the shared phrase cache fills.
- **Robot:** $0.
- **Compute and storage:** about $0.01.
- **Total ≈ $0.07 per lesson, about $2 per 30-lesson course.** So €5 per month or a single donation covers several courses, and the first 100 users can get it free for under $200.

## 6. Free vs supporter: honest Anna's-Archive framing
- The **free lane** is a shared, slower queue: one lesson at a time, a few courses per month. The wait is real, not artificial. A full lesson takes about 2–4 minutes to write, check and voice, and the free lane waits its turn.
- The **supporter lane** (any donation, or €5 per month): priority queue, parallel generation, more courses.
- The message: *"Every lesson costs us about 7 cents. Donations keep the library free for everyone. Donors skip the queue."*
- The **first 100 accounts** get the supporter lane free: a counter in the database.

## 7. RemNote import
RemNote exports cards as text or Markdown with `front >> back`, `front :: back` (both directions) and `front ;; back`, plus nesting. Anki-style CSV/TSV is also common. MVP: parse those four shapes. Then an LLM pass sets the direction (which side is the target language), splits multiple meanings, drops non-language cards and flags duplicates. The user sees "214 words found, 12 skipped" plus 10 examples, then confirms. A **real export from you** is needed to test it (HIL).

## 8. Learn order and batching
1. Score each item: frequency (wordfreq list per language), length (syllables), type (word or phrase), and dependencies (phrases after their words).
2. The LLM groups items into situations ("café", "directions"), like our module themes.
3. Batch 6–10 new items per lesson, short and frequent first, with every phrase after the words it contains.
4. Output the same `module.json` + `items.json` the curriculum pipeline already uses.

The checker then guarantees no untaught words, coverage, and spaced reviews.

## 9. Lesson length for user courses
Our official lessons run 30 minutes. User courses could default to **15 minutes** (6 new items): faster to generate, cheaper, better for busy people. The method and checker already scale; only `targetMinutes` changes. This is your decision (HIL).

## 10. Risks
- **Copyright and privacy:** decks can contain textbook content or personal notes. Keep them private by default; sharing is opt-in and confirms "I have the right to share this". Add a privacy policy, delete on request, keep the data in the EU.
- **Google Play billing:** inside a Play Store app, unlocking features with an outside donation is not allowed; Play Billing (with a 15% fee) is required. Options: ship the APK outside Play for the first 100 (GitHub, website, F-Droid), or make the supporter lane web-only, or use Play Billing later. This is your decision.
- **LLM writes a bad lesson:** the checker blocks it before any audio is made. After 3 failed tries the lesson is marked "needs review" and shows up in BackOffice.
- **Languages other than Greek:** eSpeak speaks over 100 languages; OpenAI covers the sentences. The syllabifier is Greek-only, so other languages use hyphenation patterns (the Hunspell/pyphen dictionaries) until each gets a proper one.
- **Abuse:** decks that aren't vocab, or spam. Per-account caps, a maximum of 400 items per deck, and the LLM cleanup rejects decks that are not vocabulary.

## 11. Why this order
Prove the hybrid lesson sounds good (official Greek course) → automate the writer → import your own deck locally → only then build the server, sign-in and payments. Each step is useful alone, and nothing is built for users before the audio is good.
