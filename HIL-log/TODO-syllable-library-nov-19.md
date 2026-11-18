# TODO: syllable library (Nov 19)

Goal: hear and rate the syllable audio on your phone. About 45 minutes.

## 1. Firebase console (10 min)
- [ ] Authentication → Sign-in method → turn on **Email/Password**
- [ ] Authentication → Users → **Add user** (your email + a strong password)
- [ ] Firestore Database → **Create database** (production mode)

## 2. Terminal, on your computer (10 min)
```bash
cd jim && git pull
cd AudioGeneration && npm install
npm run set-admin -- YOUR_EMAIL
cd ../CloudFunctions && firebase deploy --only storage,firestore:rules
```

## 3. Make and upload the audio (15 min, about $0.10)
```bash
cd ../AudioGeneration
npm run syllables -- greek/module1 --dry-run   # free: check the syllables look right
npm run syllables -- greek/module1
npm run syllables:upload -- greek/module1
```

## 4. Phone (as long as you like)
- [ ] GitHub → repo → Actions → **BackOffice APK** → newest run → download **jim-backoffice-apk** → unzip → install
- [ ] Sign in, rate clips: ✓ ~ ✗. The scoreboard shows which piece style wins.

## 5. Save your ratings into the repo
```bash
npm run syllables:reviews -- greek/module1
git add curriculum && git commit -m "Syllable reviews" && git push
```

## Optional, while you're at it
- [ ] `npm run syllable-test`, then listen in `output/syllable-test/`
- [ ] `npm run generate` → lessons 1, 10, 30 (about $1). Listen with the player app.

Stuck? Tell Claude the exact error message.
