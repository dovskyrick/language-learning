# Brainstorm: why single-word TTS clips come out bad

Written 2026-11-19, before the STT audit exists. Human summary: [brainstorm-short-tts-HIL-40W.md](brainstorm-short-tts-HIL-40W.md).

## Symptom
Many whole-word and piece clips are mostly silence followed by a random or unrelated syllable, or are badly cut. Some syllables are fine.

## Hypothesis 1: rate limiting (your memory from earlier work). Verdict: unlikely
- OpenAI rate limits answer with a **429 error**, not with worse audio. Our build script has no retry, so a 429 would have **crashed the run**, not saved a bad clip. Your run finished, so it was not throttled.
- No forum report found of TTS audio degrading under load.
- So an overnight run with 1-minute waits would **not** change the audio. It is the same model getting the same short inputs.

## Hypothesis 2: very short inputs break the model. Verdict: very likely
Long-running OpenAI community threads (2023–2026) report the exact symptoms:
- single words come back **silent** (all voices, both tts-1 and tts-1-hd)
- words **clipped** ("earch" for "Research")
- one-word answers like "yes" and "no" spoken unreliably
- **non-English** short inputs "unpredictable and often really wrong"
- gpt-4o-mini-tts has its own silence, repetition and cut-off reports

Our worst inputs are the shortest and the least word-like: single syllables ("ρα", "ο") and word endings ("λατεία"). The model also has to guess the language from 2–6 letters.

## Hypothesis 3: our own processing. Verdict: partial, the audit will tell
- The Plan A splitter can pick the wrong gaps, which gives cut syllables and A1/A2 pieces. Whole-word clips are not cut, so it cannot explain those.
- The BackOffice player sometimes clips the first part of a clip, which is a separate issue in the backlog.
- Re-encoding adds about 50 ms of silence, which is harmless.

## Solutions, best first
1. **Never send a lone word.** Send it in a frame and cut it back out:
   - **(a) Repeat frame:** "Ευχαριστώ. Ευχαριστώ. Ευχαριστώ." Our existing silence splitter cuts the three copies apart, and we keep the best one, usually the middle copy (neutral pitch) or the last (natural final fall). No new tools needed.
   - **(b) Carrier sentence:** "Η λέξη είναι: ευχαριστώ." Cut with the Greek forced aligner from the audit plan, once that exists.
   - **(c) Lead-in cue** that a forum user found "quite reliable": a leading pause or ellipsis before the word.
2. **Generate several and check right away (best-of-N).** After each request, check the clip: not silent, speech length plausible for the syllable count. If the check fails, retry with the next frame, up to 5 takes. Later the STT audit picks the best take automatically.
3. **Proper retry on errors:** wait and retry on 429/5xx (exponential backoff) instead of crashing.
4. **Tell the model it is Greek:** gpt-4o-mini-tts with instructions ("Native Greek speaker, say the word clearly, once").
5. **A Greek-native TTS for Greek clips:** Azure `el-GR` neural voices or Google Cloud Greek voices. They are built for short prompts and support SSML (pauses, rate, phonemes), and the module's text fits inside their free monthly allowance. Downside: a different voice from the OpenAI narrator, which is fine if all Greek uses one voice. Worth one A/B test.
6. **Pieces and syllables:** prefer cutting them from a good whole word (Plan A/B) over voicing "ρα" on its own (Plan 0). Short fragments are exactly what TTS fails at.

## The overnight idea, reframed
Waiting between requests won't help, but a **long unattended batch** is still useful as **best-of-N**: every word in 2–3 frames × several takes, each checked instantly, the best kept, and everything logged. For 85 words that is a few hundred tiny requests, a few cents, and **minutes, not a night**. Add a polite 1–2 s gap and backoff anyway, which is free safety.

## Proposed first build (tomorrow, with the audit)
`npm run syllables -- greek/module1 --frame repeat --takes 3`:
- the repeat frame, split on silence
- an instant signal check, retrying on failure
- retry and backoff on errors
- every take kept in `_raw/` with a log

The audit then ranks the takes, and you only review the doubtful ones.

Sources: OpenAI community forum threads on silent and truncated single-word TTS, unreliable one-word answers, non-English TTS problems and gpt-4o-mini-tts issues; OpenAI rate-limit docs and the 429 help article.
