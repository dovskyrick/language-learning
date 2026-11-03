# Roadmap: syllable and build-up audio

Status: `DECIDED` order of work, `LOOSE` dates. Written 2026-11-03.

## The problem, measured
Long words are taught backwards, Pimsleur-style: *στώ… ριστώ… χαριστώ… ευχαριστώ*. Greek Module 1 has **86 build-up words and 241 unique pieces**. Today every piece is sent to TTS on its own, which can misread short pieces, put the stress in the wrong place, or sound unlike the whole word.

Since 2026-11-03 the checker requires every piece to be an **ending** of its word. Three bad pieces were fixed (ροφ, τερ, ήλι). So each piece needs only **one cut**: from a syllable boundary to the end of the whole-word recording. This makes Plans A and B much simpler.

## Plans

| Plan | What | Cost per module | When |
|---|---|---|---|
| **0: baseline** | Each piece voiced on its own by TTS (today's default). | ~$0.05 | Heard in this week's test |
| **A: hyphen TTS + silence split** | Send the word hyphenated (ευ-χα-ρι-στώ), hoping TTS says the right sounds with a silence between syllables. A script finds the silences (ffmpeg `silencedetect`) and cuts **exactly in the middle of each one**. Pieces are made from the syllable clips. Details below. | ~$0.05, fully automatic | This week's test, then Nov |
| **B: automatic cuts on the whole word** | No hyphens: find syllable boundaries in normal whole-word audio by machine. Three methods vote: B1 signal, B2 forced alignment, B3 TTS timestamps. Details in [plan-b-auto-slicing.md](plan-b-auto-slicing.md). | ~0, with some bugs | Dec–Jan, if A fails |
| **C: Komma** | Back-office GUI with a waveform and draggable dashed cut lines. It fixes only what Plans A or B flag. Details in [plan-c-komma.md](plan-c-komma.md). | ~10 min per module | February |

## Plan A in detail
1. **Take:** voice `ευ-χα-ρι-στώ` with tts-1 or gpt-4o-mini-tts, with or without a "pause between syllables" instruction, at speed 1.0 and 0.85.
2. **Detect:** run `silencedetect` (start at −40 dB, minimum 60 ms). Keep the N−1 longest inner silences, where N comes from the Greek syllabifier.
3. **Accept only if** exactly N−1 silences are found, each syllable clip is 80–450 ms, and the recognition check passes (see Plan B QA). If not, retry with the next variant (`ευ - χα`, `ευ... χα`, slower speed) and give up after 3 takes. Rejected words go to Plan B or Komma.
4. **Cut** at the midpoint of each silence, at a zero crossing, with a 5 ms fade.
5. **Build pieces:**
   - **A1:** *ριστώ* = the ρι and στώ clips joined with their half-silences, so it plays slowly and clearly, syllable by syllable, as a teacher would.
   - **A2:** the same clips with the silences shrunk to about 40 ms, so the piece sounds closer to normal speech.
   - The whole word always comes from a normal (non-hyphen) take.

   Pick A1 or A2 by ear in the test.

**Risk:** the hyphen take may change the sounds. For example, a syllable said alone may get its own stress, or the voice may read the hyphens aloud. That is why there is the recognition check, and why you listen first.

Ground truth for Plan B: you mark about 20 words in Komma v0, or accept Plan A cuts that you have checked by ear.

## Decision gates
1. **Gate 0, whole lessons (≈ Nov 14).** Listen to lessons 1, 10 and 30 ([listening-test.md](listening-test.md)). If whole-word Greek quality is bad, fix the voice or model first. Syllables come after.
2. **Gate 1, Plan A.** If a hyphen variant scores 2 on at least 5 of the 6 test words, build the silence splitter (about 1 day), run it on all 86 words, and keep Plan B in the backlog. If only the baseline sounds fine, keep Plan 0. If neither works, start Plan B.
3. **Gate 2, Plan B accuracy** (measured against the ground truth). If at least 90% of cuts land within 30 ms, B goes live with QA flags. If below 70%, Komma becomes the main tool and B only pre-places the lines.
4. **Gate 3, Komma (February).** Needed before Module 2 or a second language, or before hiring anyone to fix cuts.

## How it plugs in
Cut pieces are saved into the vocab audio library under the piece's own text, so the generator reuses them instead of calling TTS. The generator needs no new logic. To do: confirm the key format in `vocab-manager.ts`. A cut file lives at `curriculum/<lang>/<module>/cuts/<word>.json` (`{ word, audio, cuts: [ms…], source: "A"|"B1"|"B2"|"B3"|"komma", confidence }`).
