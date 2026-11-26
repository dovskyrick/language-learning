# Brainstorm: non-neural "robot" TTS for Greek words and syllables

Written 2026-11-20. Status: `LOOSE`, waiting for your ear test. Samples: `AudioGeneration/samples/non-neural-greek/`.

**Verdict.** Yes, go non-neural for single words, syllables and build-ups. Neural TTS fails exactly on short inputs, and rule-based engines never do. They say every syllable the same way every time, for free, offline. Long sentences and English stay with OpenAI.

**Candidates.** eSpeak NG is a formant voice that ships with Greek, weighs about 2 MB, and is GPLv3. The MBROLA gr1 and gr2 diphone voices are more human, but their licenses are non-commercial, so demo only. I found no open Greek HMM voices.

**Tested here today.** eSpeak NG gets the Greek right: ευχαριστώ → efxaristo, γιατρός → jatros, συγγνώμη → siŋgnomi, stress included. One bug: a lone "ο" is read as "omikron". Feeding phonemes (`[[o]]`) fixes it, and the script will do that automatically.

**Why it solves our mess.** No silent clips, no random syllables, no cutting, no splitting. We just ask for "ρι" or "ριστώ" and get exactly that. Speed and pitch are controllable. The audit and the cutter become unnecessary for these clips.

**On the phone itself?** Technically yes. eSpeak ran on 1990s computers and renders instantly. But there is no ready Expo plug-in: it needs a small native Android module (about 2–3 days). It is GPLv3, which is fine while the app is open source.

**Even easier phone option.** Android's built-in Greek voice (Google TTS, offline) through `expo-speech` takes about one hour of work. The catch: each phone sounds different, and some need the Greek voice downloaded first. Fine for BackOffice testing, risky for the lessons.

**My recommendation.** First, render the eSpeak clips on your PC inside the existing pipeline. That takes minutes, costs $0 and needs no API. Storage is not a problem: all 241 pieces are about 2 MB. Move to on-device later, when content becomes dynamic (flashcards, songs).

**Voice mix.** The OpenAI voice says sentences and English. The robot "coach" breaks words down: "ευ… χα… ρι… στώ". Make it a feature, not a bug. In Hook Songs, a robot voice fits electronic music perfectly, with a vocoder vibe for free.

**Shelving.** The hyphen-TTS splitter (Plan A/B) is now `SHELVED`, but the code stays in the repo. The Firebase syllable clips stay too: they are small, and BackOffice can compare old and new. We delete them later with one command.

**Next steps.** You listen to the four samples and pick a voice. I add `--engine espeak` to `npm run syllables` (about half a day), regenerate, and upload. You rate a few in BackOffice. Then it goes into the lessons.
