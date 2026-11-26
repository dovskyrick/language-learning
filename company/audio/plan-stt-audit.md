# Plan: automatic audit of the syllable library (speech-to-text)

Status: `DECIDED` direction, not built yet. Written 2026-11-19. Goal: you only listen to the clips the machine doubts.

## Model
- **Main: `jonatasgrosman/wav2vec2-large-xlsr-53-greek`.** A Greek speech model that outputs letters (CTC), about 1.2 GB, runs on CPU and is downloaded once. It has no word dictionary, so it does not "correct" ρα into a real word.
- **Second opinion, whole words only: faster-whisper `small`, language `el`.** Whisper makes up text on very short clips, so it is never used on syllables.

## Three checks per clip
1. **Expected-text score.** We already know what each clip should say. We measure how well the expected letters fit the audio (CTC forced alignment, average log-probability per letter). This works even for one syllable, where free transcription is unreliable.
2. **What it heard.** The letters the model writes on its own, compared with the expected text (character error rate). This is shown to you as "heard: λα / expected: ρα".
3. **Signal checks.** Speech length against the syllable count; mostly-silence ratio; sound already loud in the first 10 ms (cut onset); clipping; too quiet.

Verdict per clip: `pass`, `doubt` or `fail`, with reasons. Output: `output/syllables/<lang>/<module>/audit.json`, uploaded next to the manifest.

## Calibrate with your ratings
Your BackOffice ratings (`npm run syllables:reviews`) are the answer key. We tune the thresholds until "fail" catches most of your ✗ ratings and "pass" rarely contains one. Then we report agreement as numbers.

## BackOffice
It shows the audit badge on each clip, and a filter and sort for "machine doubts" first. Your rating always overrides the machine.

## Same model, second job
The forced alignment from check 1 is Plan B2 (cut syllables from the whole word). Once the audit works, the cutter is about one more day of work.

## Where it runs
`AudioGeneration/audit/` (Python: torch CPU, transformers, soundfile). Command: `npm run syllables:audit -- greek/module1`. It takes about 5–10 minutes for roughly 1,300 clips on a laptop. It cannot be tested in the cloud session until `huggingface.co` is allowed there. Otherwise it is tested on your PC.

## Backlog (not a priority): BackOffice player reliability
About 1 in 4 plays cuts the start of a clip that is fine on the PC. Likely causes:
- Bluetooth or the audio output waking up (it eats the first ~100–300 ms).
- Streaming start-up of tiny files.
- Our clips beginning with only 50 ms of silence.

Fixes, in order:
1. Download each word's clips to the phone before playing.
2. Add 300 ms of silence in front of each clip in the player only, not in the files.
3. Keep the audio session warm with a silent clip.
4. Move from expo-av (deprecated) to expo-audio.
5. Add a "replay" button and a "played from cache" indicator.
