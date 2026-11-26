# Hook Songs: brainstorm (for agents)

Status: `LOOSE`. Written 2026-11-18. Human summary: [brainstorm-HIL-50W.md](brainstorm-HIL-50W.md). Plan: [roadmap-music.md](roadmap-music.md).

## 1. Goal and hard constraints
Short (60–120 s) light-hearted electronic tracks where **the hook is the vocab**. Genres: deep house (120–124 BPM), afrobeats/amapiano (100–115), liquid DnB (170–174), 90s jungle (160–170). Each song covers 3–5 items, mostly already taught (review), with at most 1–2 new ones, and a highly repetitive structure.

Constraints in priority order:
1. **Pronunciation must be exactly right.** A catchy wrong word does more harm than no song. This is the constraint that decides the architecture.
2. **License-clean.** The project is open source and will have donations and a paid tier, so no copyrighted samples and no non-commercial model weights in shipped output.
3. **Cheap:** under $0.10 per song, ideally $0.
4. **Deterministic and automatable,** like the lesson pipeline: a spec, a checker, a render, then a human rating.

## 2. Core insight: these are vocal-chop genres
Every chosen genre already treats vocals as **chopped samples on a grid**:
- house: one-shot vocal hooks and stabs
- jungle: chopped breaks with ragga and MC samples
- liquid: soulful vocal chops
- afrobeats/amapiano: chants and call-and-response

So the "singer" never has to sing. Our **TTS clips**, already generated, reviewed in BackOffice and pronounced correctly, become the instrument: chopped, pitched, repeated, filtered and sidechained. That is genre-native, not a compromise.

The pedagogy maps onto music form almost one to one:

| Pimsleur mechanic | Music device |
|---|---|
| Backward build-up (στώ… ριστώ… ευχαριστώ) | **Riser / build-up** before the drop, one syllable piece per bar. The syllable library from Plan A is reused. |
| Anticipation (prompt, then pause, then answer) | English cue, then **1 bar of near-silence** (the learner says it), then **the drop lands on the Greek word** |
| Graduated recall | The hook returns at drop 1, the break and drop 2; the outro asks without the answer |
| Small number of new items | 1 hook item + 2–4 review items as ad-libs |

## 3. Song form template (bars at 4/4)
`intro 8 → teach 8 → build 8 → gap 1 → drop A 16 → break 8 (call-response) → build 4 → gap 1 → drop B 16 → outro/test 8` = **78 bars**. At 122 BPM a bar is about 1.97 s, so that is roughly 2:33, too long. Trim the drops to 8 bars to get about 1:55, or use DnB tempo, where one 4/4 bar at 172 BPM is 1.40 s.
- **Intro:** English MC line, funny ("Three words. One café. Zero shame.").
- **Teach:** meaning, then the Greek word twice, clean, no pitch effects (the reference pronunciation).
- **Build:** syllable pieces A1/A2 on a filter riser.
- **Gap:** "Thank you?" and then silence.
- **Drop:** the hook word, chopped (full word on beat 1, last syllable stuttered on the off-beats).
- **Break:** call-response for the review items (English, gap, Greek).
- **Outro:** English cues only, then silence. The learner answers.

Rule: **the first and the last time a word is heard it is unprocessed TTS.** Effects only in between.

## 4. Where the instrumental comes from

| Option | How | Cost | Quality | License | Timing control |
|---|---|---|---|---|---|
| **P · procedural synth** | numpy synthesis: 909-style kick (sine sweep), noise hats, claps, sub/reese bass, chord pads; effects via `pedalboard` | $0 | demo-to-decent, consistent | clean (all ours) | exact grid |
| **S · CC0 samples** | one-shots and loops from CC0 packs, sequenced by code | $0 | decent-good | check each pack; CC0 only | exact grid |
| **M · open model** | ACE-Step 1.5 (Feb 2026; XL Apr 2026, 4B, under 4 GB VRAM claimed, 50+ languages) or Stable Audio 3.0 Small (459M, up to 2 min, on-device) | GPU minutes ≈ cents | good-great | ACE-Step: sources say Apache-2.0 *or* MIT, **verify the LICENSE file**. Stable Audio: Community License, free under $1M revenue | must beat-track |
| **A · API** | Lyria 3 Pro ≈ $0.08/song (≤3 min), MiniMax Music ≈ $0.03–0.15, ElevenLabs Music ≈ $0.15/min (sources disagree), Mureka ≈ $0.045 | $0.03–0.45 | great | read each ToS for output ownership and commercial use | must beat-track |

**Avoid** Meta MusicGen weights (CC-BY-NC) for anything shipped, Suno and Udio (no clean API, legal history), and the original Amen break or any record sample. Recreate breaks procedurally or use CC0 ones.

For M and A: request instrumental only, at a stated BPM and key. Then beat- and downbeat-track it (`beat_this`, or librosa as a fallback), time-stretch to the exact BPM (rubberband), and place the vocals on the detected grid. Reject a bed if the tempo drifts more than 1% or no clear downbeat is found.

## 5. Where the voice comes from

| Option | How | Risk |
|---|---|---|
| **V1 · TTS chops** | Clips from the lesson/vocab library and the syllable library, placed on the grid | none for pronunciation; may sound "spoken" (fine for house and jungle MC style) |
| **V2 · tuned TTS** | Quantize the pitch contour to the song's key with WORLD/PSOLA (`pyworld`, `parselmouth`), plus formant-safe shift, short reverb and delay throws. This is the "autotune hook" | mild artefacts; keep the teach and outro clips unprocessed |
| **V3 · AI-sung** | ACE-Step or an API sings Greek lyrics | **mispronunciation**. Gate: Greek wav2vec2 ASR on the isolated vocal (stem split with Demucs), with character error rate on hook lines ≤ 0.15, plus human rating. Experiment only |
| **V4 · singing synthesis** | DiffSinger-style voicebanks | no good Greek voicebank, so skip |

English MC lines: an existing TTS voice, maybe gpt-4o-mini-tts with "hype MC, playful" instructions. That is funny and cheap.

## 6. Song spec (LLM-written, checker-verified, same machinery as lessons)
```json
{ "id": "gr-m1-s01", "genre": "deep-house", "bpm": 122, "key": "A minor",
  "hook": "i006", "review": ["i005", "i001", "i012"],
  "mc": { "intro": "Three words. One café. Zero shame.", "cue:i006": "Thank you?" },
  "form": ["intro:8", "teach:8", "build:8", "gap:1", "dropA:8", "break:8", "build:4", "gap:1", "dropB:8", "outro:8"] }
```

Checker rules:
- Items are taught at or before the target lesson.
- The hook is heard at least 8 times, with at least 2 unprocessed.
- Every review item gets a cue, a gap and an answer.
- Length is 60–120 s.
- English lines are at most 8 words.
- The MC lines use no Greek beyond the song's items.

The creativity dial, as in lessons, sets how wild the MC lines and effects are.

## 7. Genre recipes (procedural MVP)
- **Deep house 122:** four-on-the-floor kick, clap on 2 and 4, open hat on the off-beat, Rhodes-like minor 9 chord stabs, off-beat sub bass, sidechain pump. The hook is a chopped word on beat 1 and a stuttered final syllable on the "&" beats.
- **Afrobeats/amapiano 112:** syncopated 3-3-2 kick, shaker 16ths, rim and wood percussion, log-drum bass (pitched sine with a fast pitch-drop envelope). Call-and-response chants: the MC asks, the hook answers.
- **Liquid DnB 172:** two-step break (kick 1 and "3&", snare 2 and 4), rolling sub, pads and Rhodes, with an airy reverb on the vocal chops. Gaps sit naturally in the half-time feel.
- **90s jungle 165:** chopped breakbeat (ours, synthesized or CC0, re-sequenced), deep sub stabs, a ragga-style pitched-up hook with delay throws, rewind SFX before drop B (a fun recall cue).

## 8. MVP architecture ("hook-machine")
A new folder `HookSongs/` in Python. Audio DSP is far easier there, and the TS pipeline only hands over clips and a spec.
```
spec.py      load + check song specs
clips.py     fetch voice clips (syllable library, vocab library, TTS cache; TTS for MC lines)
grid.py      bpm/bar math, placement
synth/       drums.py bass.py chords.py fx.py  (numpy)
genres/      deep_house.py afrobeats.py liquid.py jungle.py  (patterns per section)
vocals.py    chop, stutter, pitch-quantize (V2), gaps
mix.py       sidechain, pedalboard reverb/delay/comp, limiter, loudness −14 LUFS (pyloudnorm)
render.py    CLI: spec → wav/mp3 + song manifest
```
Output follows the lesson audio path, then BackOffice gets a "Songs" tab for ✓ ~ ✗ ratings (catchiness, word clarity). Dependencies: numpy, soundfile, pedalboard (GPLv3, fine for an open-source repo), pyloudnorm, praat-parselmouth (GPL), and optionally pyrubberband.

## 9. Risks
- **Cringe:** the main product risk. Mitigate with short songs, self-aware MC humour, and real groove from the genre recipes. Rate catchiness separately.
- **Word lost in the mix:** duck the music 3–6 dB under every teach and outro word, and keep the vocal in the 1–4 kHz presence band.
- **Procedural sounds cheap:** M1 adds CC0 one-shots; M3 tries AI beds.
- **AI model license changes:** pin the versions, keep the license text in the repo, and record which model made each bed in the manifest.
- **Learners sing the wrong stress because of the rhythm:** put the stressed syllable on a strong beat (the syllabifier plus accent position gives this). This is a checker rule.

## 10. Recommendation
Build **P + V1/V2 first.** It has exact pronunciation, costs $0, gives full timing control, is license-clean, and reuses the syllable library and the BackOffice. Keep the arranger independent of where the bed comes from, so M (ACE-Step on a rented GPU) or A (Lyria 3 at about $0.08) can be dropped in later and A/B-tested against procedural. Treat AI-sung Greek (V3) as research behind an ASR gate, never the default.

## 11. Open questions for the human
- Should songs live in the main player app as a "bonus track" every 5 lessons, or as a separate playlist?
- Should the MC voice be the same as the lesson narrator, or a separate character?
- Should any human-made music be commissioned for intros/outros, for brand identity?

Sources consulted (Nov 2026): ACE-Step 1.5 paper (arXiv 2602.00744); ACE-Step 1.5 XL coverage (gigazine, Apr 2026); Stable Audio Open Small and 3.0 (stability.ai, The Decoder); API pricing roundups (fal.ai, CometAPI, apiframe). License and price claims are unverified against primary terms. Verify before use.
