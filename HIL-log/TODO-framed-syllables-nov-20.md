# TODO: framed syllables (Nov 20)

New TTS trick: every request is now "Ευχαριστώ. ευ-χα-ρι-στώ. Ευχαριστώ." Pieces are said three times. About 10 minutes, ~$0.15.

## 1. Regenerate and upload
```bash
cd jim && git pull
cd AudioGeneration
npm run syllables -- greek/module1
npm run syllables:upload -- greek/module1
```

## 2. Listen
- [ ] On PC: `output/syllables/greek/module1/i006/` (whole, whole-first, take, s1…, p1-tts…)
- [ ] In the app: pull down to refresh, rate a few words

## 3. Tell Claude
- [ ] Better or worse than yesterday? Which words still fail?
