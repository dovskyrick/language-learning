# Roadmap: from robot-voice MVP to user-made courses

Starts week of 2026-11-23. Status: `DECIDED` order, `LOOSE` dates. Details: [architecture-lesson-engine.md](architecture-lesson-engine.md).

| Phase | What | Effort | Gate |
|---|---|---|---|
| **P0 · hybrid lesson** | `npm run lesson:render`: OpenAI sentences + robot words and build-ups, stitched, loudness-matched. Render Greek M1 lessons 1, 10, 30. | 2 days | You'd happily listen to lesson 1 on a walk. |
| **P1 · official library** | Render all 30 lessons, upload them, and give the player a minimal Library screen (course → lessons). | 2 days | 30 lessons play in the app without glitches. |
| **P2 · automatic writer** | Claude Haiku 5.5 writes the lesson JSON, the checker gates it, retry on errors. Cost logged per lesson. | 2–3 days | 9 of 10 lessons pass in ≤3 tries; ≤ $0.03 per lesson for text. |
| **P3 · deck → course (local)** | Import a RemNote export, clean it, plan the learn order, write and render. On your PC, from one command. | 3 days | Your own deck becomes a course you'd actually use. |
| **P4 · server + accounts** | Cloud Run worker, Firestore jobs, sign-in, and the "Make a course" screen. The first 100 accounts get the fast lane free. | 1–1.5 weeks | A friend makes a course from their phone without your help. |
| **P5 · supporter lane** | Donation page (Ko-fi/Stripe/Liberapay), webhook → supporter flag, priority queue, Support button. | 3–4 days | One real donation flips the lane automatically. |
| **P6 · shared library** | Opt-in sharing, BackOffice review tab, public course list. | 3–4 days | First user-made course published. |

**Order logic:** prove the audio (P0–P1), then automate the text (P2–P3), and only then build servers, accounts and money (P4–P6).

**Later:** on-device robot voice and timeline playback, Hook Songs ([company/music/](../music/roadmap-music.md)), more languages, R2 for storage.

**Never:** user decks public without opt-in; payments inside a Play Store build that skip Play Billing; lessons voiced before they pass the checker.
