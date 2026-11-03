# Roadmap: syllable and build-up audio

Status: `DECIDED` order of work, `LOOSE` dates. Written 2026-11-03.

## The problem, measured
Long words are taught backwards, Pimsleur-style: *στώ… ριστώ… χαριστώ… ευχαριστώ*. Greek Module 1 has **86 build-up words and 241 unique pieces**. Today every piece is sent to TTS on its own, which can misread short pieces, put the stress in the wrong place, or sound unlike the whole word.

Since 2026-11-03 the checker requires every piece to be an **ending** of its word. Three bad pieces were fixed (ροφ, τερ, ήλι). So each piece needs only **one cut**: from a syllable boundary to the end of the whole-word recording. This makes Plans A and B much simpler.

## Plans

| Plan | What | Cost per module | When |
|---|---|---|---|
| **0: TTS tricks** | Hyphens (ευ-χα-ρι-στώ), "...", slow speed, `gpt-4o-mini-tts` with "say each syllable" instructions, or pieces voiced on their own (today's default). | ~$0.05 | This week |
| **A: hand cuts** | Generate the whole word, mark cuts in Audacity (label track, export labels), then a script slices with ffmpeg. | ~2 hours of your time (86 words × ~1 min) | If Plan 0 fails, for Module 1 |
| **B: automatic cuts** | Find syllable boundaries in the whole-word audio by machine. Three methods voting: B1 signal, B2 forced alignment, B3 TTS timestamps. Details in [plan-b-auto-slicing.md](plan-b-auto-slicing.md). | ~0, with some bugs | Dec–Jan |
| **C: Komma** | Back-office GUI with a waveform and draggable dashed cut lines. It fixes only what Plan B flags. Details in [plan-c-komma.md](plan-c-komma.md). | ~10 min per module | February |

Plan A labels are not wasted: they become the **ground truth** used to measure Plan B. Komma replaces Audacity once it exists.

## Decision gates
1. **Gate 0, whole lessons (≈ Nov 14).** Listen to lessons 1, 10 and 30 ([listening-test.md](listening-test.md)). If whole-word Greek quality is bad, fix the voice or model first. Syllables come after.
2. **Gate 1, Plan 0.** If one trick scores OK on at least 5 of the 6 test words, use it everywhere and stop here (keep Plan B as a backlog item). Otherwise do Plan A for Module 1 so it ships, then start B.
3. **Gate 2, Plan B accuracy** (measured against Plan A labels). If at least 90% of cuts land within 30 ms of your hand cut, B goes live with QA flags. If below 70%, Komma becomes the main tool and B only pre-places the lines.
4. **Gate 3, Komma (February).** Needed before Module 2 or a second language, or before hiring anyone to fix cuts.

## How it plugs in
Cut pieces are saved into the vocab audio library under the piece's own text, so the generator reuses them instead of calling TTS. The generator needs no new logic. To do: confirm the key format in `vocab-manager.ts`. A cut file lives at `curriculum/<lang>/<module>/cuts/<word>.json` (`{ word, audio, cuts: [ms…], source: "A"|"B1"|"B2"|"B3"|"komma", confidence }`).
