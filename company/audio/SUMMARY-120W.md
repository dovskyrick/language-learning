# Syllable audio in 120 words

Module 1 build-ups (στώ… ριστώ… ευχαριστώ) cover 86 words and 241 pieces. Every piece is now a word ending, so each needs one cut from the whole-word audio.

**This week:** you voice lessons 1, 10 and 30 locally (no OpenAI access here) and score ten TTS variants.

- **Plan A:** voice hyphenated words (ευ-χα-ρι-στώ), detect the silences, cut each at its midpoint, build pieces from the clips, with automatic retries and checks.
- **Plan B:** if A fails, automatic cuts on whole words. Signal energy (B1), Greek wav2vec2 forced alignment (B2) and ElevenLabs timestamps (B3) vote; QA flags doubtful cuts.
- **Plan C, Komma:** a February web tool with a waveform and draggable dashed cut lines. Staff fix only flagged cuts.
