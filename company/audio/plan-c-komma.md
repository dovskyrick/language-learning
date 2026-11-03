# Plan C: Komma (cut editor)

**Name:** Komma, from Greek κόμμα, "a piece cut off" (from κόπτω, "to cut"), the root of "comma". Target: **February 2027**. Status: `LOOSE`.

## What it is
A back-office web page for fixing syllable cuts by ear and eye. You or hired staff only see the cuts Plan B flagged.

## Screen
- Word, its syllables (ευ · χα · ρι · στώ) and the confidence badge.
- A large **waveform** (wavesurfer.js) with a spectrogram underneath, which makes fricatives and stop closures visible.
- **Dashed vertical lines**, one per cut, labelled with the syllable they start. Drag to move, double-click to add, Delete to remove. The B1, B2 and B3 guesses show as faint ghost lines.
- A row of **piece buttons** (στώ, ριστώ, χαριστώ, whole). Each plays exactly what the lesson will play, with the fade applied.

## Keyboard (speed matters)
Space plays the whole word. 1–9 plays a piece. Tab selects the next cut. ←/→ nudges by 5 ms (Shift for 1 ms). Enter accepts and opens the next flagged word. R marks the word to regenerate with TTS.

## Data
It reads and writes `curriculum/<lang>/<module>/cuts/<word>.json` (format in the roadmap). Saving sets `source: "komma"` and `confidence: 1`, and the slicer re-cuts that word. Each fix is logged (who, before, after). That log becomes training and test data for Plan B.

## Build
- **v0 (January):** a local page served by `npm run komma`, with a small Node server, one HTML file and wavesurfer.js. No login.
- **v1 (February):** the same page inside the back office, behind Firebase Auth. Includes a staff queue and progress per module.
- Out of scope: editing lesson text, and general audio editing.

**Done when** a flagged word takes under 20 seconds to fix and Module 1's queue can be cleared in under 30 minutes.
