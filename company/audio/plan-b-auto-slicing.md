# Plan B: automatic syllable cuts

Goal: given the TTS audio of a whole word and its known syllables, find the N−1 cut points. Each build-up piece is then `audio[cut_k … end]`.

We have two advantages over general syllable detection: **the text is known**, and **the speech is clean single-voice TTS**. So this is an *alignment* problem, not a *discovery* problem.

## Shared preparation
- **Greek syllabifier** (rule-based, about 60 lines). It splits between vowels except for diphthongs and digraphs (αι, ει, οι, ου, αυ, ευ, μπ, ντ, γκ, τσ, τζ) and keeps legal onset clusters together (στ, πρ, κλ…). It produces the syllables and checks that build-up pieces start on a syllable boundary. The same code goes into the lesson checker.
- **Generate the word with padding** ("…ευχαριστώ…") at normal speed and again at 0.85. Two takes give a second chance to agree.
- 16 kHz mono WAV for analysis; cut the original mp3 or 24 kHz audio.

## B1: signal (no ML, runs anywhere)
1. Compute a 10 ms RMS envelope in two bands: vowel band 300–2500 Hz, and fricative band above 4 kHz.
2. Find **exactly N vowel nuclei**: peak-pick the smoothed vowel-band envelope, keeping the N highest prominent peaks (de Jong & Wempe 2009 syllable-nuclei method, Mermelstein 1975 convex hull). Knowing N makes this far more reliable than blind detection.
3. The boundary between nuclei k and k+1 is placed by the onset consonant of syllable k+1, read from the text:
   - Stops (π τ κ μπ ντ γκ): cut in the closure silence, just before the burst. This is the easiest case.
   - Fricatives (σ φ θ χ ζ β γ δ): cut where fricative-band energy rises.
   - Sonorants (λ ρ μ ν): cut at the vowel-band energy minimum.
   - No consonant (hiatus, as in στι-α): cut at the formant or energy minimum. Low confidence, so flag it.
4. Weak spots: hiatus, ρ taps, and unstressed vowels that TTS shortens to almost nothing.

## B2: forced alignment (expected best)
- **CTC alignment on characters.** A Greek wav2vec2 model (`jonatasgrosman/wav2vec2-large-xlsr-53-greek`, also used by WhisperX for Greek) plus CTC forced alignment gives a start time for each letter at about 20 ms resolution. A syllable boundary is the start time of its first letter. The script is Python, CPU-only and about 1 second per word.
- **Alternative:** Montreal Forced Aligner with its Greek Common Voice acoustic model and dictionary gives phone-level output. It is heavier to install and has strict dictionary needs.
- **Fallback:** a phoneme model (wav2vec2-xlsr-53-espeak) with espeak-ng Greek phonemes.
- **Refinement:** snap each boundary to the nearest B1 landmark within ±40 ms (burst, fricative rise, energy minimum).

## B3: let the TTS tell us
- **ElevenLabs `with-timestamps`** returns per-character start and end times along with the audio. Mapping characters to syllables gives the cuts directly. Voicing only the 86 build-up words costs cents. The catch: the pieces then come from a different voice than OpenAI's, so either voice the whole build-up block with ElevenLabs or accept the change of voice.
- **Google Cloud TTS SSML `<mark>`** timepoints. Marks inside a word may change pronunciation, so test this first.
- Use B3 only if B1 and B2 disagree often.

## Voting and confidence
For each cut, take the median of the available methods. **Confidence** is high if they agree within 30 ms and the cut sits in a low-energy or closure region. Low confidence goes to the Komma queue. Expected outcome: most stop and fricative onsets auto-pass, while hiatus and sonorant onsets get flagged.

## Cutting technique
Move the cut to the nearest zero crossing, then add a 5 ms fade-in (an end fade is not needed, since the word end is natural). Peak-normalise the piece to the whole word's loudness. Leave about 150 ms of padding before the piece.

## Automatic QA on every piece
- Duration must be plausible: 80–450 ms per syllable.
- The first 10 ms must be below −35 dB. Otherwise we cut mid-sound and flag it.
- Recognition check: run the Greek wav2vec2 model on the piece and compare letters to the expected piece by edit distance. If CER is above 0.4, flag it. Whisper is not used for pieces: it makes up text on very short audio.
- No clicks: check for a sample jump of more than 0.3 at the cut.

## Build order
B1 and the syllabifier (Dec, week 1). B2 CTC (Dec, weeks 2–3). Voting and QA (Jan). Score each against Plan A ground truth. B3 only after Gate 2, and only if needed.

Background: Sylber (ICLR 2025) does unsupervised syllable segmentation that even works on unseen languages. It is worth one test as a fourth voter, but it is not needed because we already know the text.
