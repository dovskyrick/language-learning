# Non-neural Greek TTS samples (2026-11-20)

Same script in each file, about 30 s:
ευχαριστώ · build-up στώ… ριστώ… χαριστώ… ευχαριστώ · syllables ευ χα ρι στώ · παρακαλώ καλημέρα Θεσσαλονίκη γιατρός συγγνώμη · σχολείο build-up (ο… λείο… σχολείο)

| File | Engine | License |
|---|---|---|
| `espeak-greek.mp3` | eSpeak NG 1.51, Greek formant voice | GPLv3: OK |
| `espeak-greek-slow.mp3` | same, speed 125 | GPLv3: OK |
| `mbrola-gr2.mp3` | eSpeak + MBROLA gr2 diphones (Univ. of Athens) | non-commercial: demo only |
| `mbrola-gr1.mp3` | eSpeak + MBROLA gr1 diphones | non-commercial: demo only |

Made with `espeak-ng -v el|mb-gr1|mb-gr2`. Lone vowels are sent as phonemes (`[[o]]`), otherwise eSpeak says the letter name ("omikron").
