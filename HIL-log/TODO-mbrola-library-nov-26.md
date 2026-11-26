# TODO: MBROLA library (Nov 26)

Make the second robot voice and compare both on the phone. About 15 minutes, $0.

## 1. Install and generate
```bash
git pull
sudo apt install espeak-ng mbrola mbrola-gr2
cd AudioGeneration
npm run syllables:mbrola -- greek/module1
npm run syllables:upload -- greek/module1 --library robot-mbrola
```

## 2. Phone
- [ ] Actions → **BackOffice APK** → install newest APK
- [ ] Switch **eSpeak / MBROLA** at the top, rate a few words in each

## 3. Decide
- [ ] Tell Claude which robot(s) to keep
- [ ] MBROLA voice is non-commercial: check the license before a paid release
