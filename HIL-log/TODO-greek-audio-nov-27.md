# TODO: full Greek course audio (Nov 27)

Turn the 30 checked lessons into mp3s in the player. Paste each prompt to Claude, one at a time, and test before moving on.

## Where we are
- [x] Lesson text: 27 checked, 3 published (1, 10, 30), all valid.
- [x] MBROLA clips for words, pieces and syllables exist.
- [ ] Gap: `npm run generate` sends everything to OpenAI, even single words like "Ναι". That is the garbled short-TTS problem again.

## Prompt 1: hybrid renderer
- [x] Built: `npm run lesson:render -- greek/module1 1`. Lesson 1 is about 25 min and costs about €0.05.
- [x] Paste: *"Build the hybrid lesson renderer (P0 in architecture-lesson-engine.md): OpenAI for `say` lines and multi-word targets, MBROLA for single words and build-up pieces. Cache clips, match loudness, keep the pauses. Render lesson 1 only."*

## Listen to lesson 1
- [ ] `git pull`, `cd AudioGeneration && npm install`
- [ ] Optional free preview, no key needed: `npm run lesson:render -- greek/module1 1 --preview`
- [ ] Real render: `npm run lesson:render -- greek/module1 1` (needs `OPENAI_API_KEY`)
- [ ] Play `output/lessons/greek/module1/lesson01.mp3` on your PC.
- [ ] Check that robot and OpenAI volumes match, pauses feel right and no clip is silent.
- [ ] Tell Claude what sounds off.

## Prompt 2: upload and manifest
- [ ] Paste: *"Make lesson:render upload to audio-lessons/greek-module1-lessonNN.mp3, and make update-manifest show 'Greek · Module 1 · Lesson N' with sensible titles. Dry-run first."*

## Approve all 30
- [ ] Skim each script in `curriculum/greek/module1/scripts/`.
- [ ] Run `npm run curriculum -- approve greek/module1 N` for each lesson you are happy with.

## Prompt 3: batch render
- [ ] Paste: *"Estimate the OpenAI cost for rendering all 30 approved lessons. Then render and upload them with --budget 5, resuming if interrupted."*
- [ ] Check `cost-tracker.json` afterwards.

## Player
- [ ] `npm run update-manifest`
- [ ] Open the player app and play lessons 1, 15 and 30 end to end.
- [ ] Note any lesson that fails to load or stutters.

## Vocab library (decision, no action)
- [x] One vocab library per course folder; `greek/module1` gets its own.
- [x] The old `greek/level1` test library is ignored.
- [x] User custom libraries wait until the player is proven.
