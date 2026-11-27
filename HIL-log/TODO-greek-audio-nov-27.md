# TODO: full Greek module audio (Nov 27)

Render all 30 lessons and put them in the player. About 30 minutes, about €1.

## 1. Get the code
- [ ] `git pull`
- [ ] `cd AudioGeneration && npm install`
- [ ] Check `.env` has `OPENAI_API_KEY`, and `firebase-service-account.json` is in place.

## 2. Check the plan (free)
- [ ] `npm run lesson:render -- greek/module1 all --dry-run`
- [ ] It shows each lesson's lines and cost. The total is under €1.50, and less in practice, because shared phrases are cached.

## 3. Budget
- [ ] Optional: change `budgetLimit` in `AudioGeneration/cost-tracker.json`. It is €10 today, total spend so far, and the render stops before going over it.

## 4. Render and upload everything
- [ ] `npm run lesson:render -- greek/module1 all --upload`
- [ ] It takes about 15–30 minutes and uploads each lesson as soon as it is done.
- [ ] If it stops (budget or network), run the same command again. Cached clips cost nothing.

## 5. Spot-check on PC
- [ ] Play lessons 1, 15 and 30 in `output/lessons/greek/module1/`.
- [ ] Look for "⚠ silent or too short" lines in the output and send them to Claude.

## 6. Player
- [ ] Open the player app → Greek → **Module 1** → lessons 1–30.
- [ ] Play a few end to end.
- [ ] Old test lessons still show under "Level 1". Ask Claude to remove them if you want.

## 7. Save
- [ ] `git add ../manifest.json cost-tracker.json`
- [ ] `git commit -m "Greek module 1 audio"`
- [ ] `git push`

## Fixing one lesson later
- [ ] Edit the lesson JSON (a line can set `"voice": "robot"` or `"voice": "openai"`).
- [ ] `npm run lesson:render -- greek/module1 N --upload`
