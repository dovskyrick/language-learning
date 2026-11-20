# TODO: robot library (Nov 20)

Make the robot voice clips and rate them on the phone. About 15 minutes, $0.

## 1. Get the code and eSpeak
```bash
cd jim && git pull
sudo apt install espeak-ng
cd AudioGeneration && npm install
```

## 2. Generate and upload (~1 minute)
```bash
npm run syllables -- greek/module1 --engine robot
npm run syllables:upload -- greek/module1 --library robot
```
Listen on PC: `output/syllables/greek/module1/robot/`

## 3. Phone
- [ ] GitHub → Actions → **BackOffice APK** → newest run → install the new APK
- [ ] Tap **Robot** at the top, rate a few words

## 4. Save ratings
```bash
npm run syllables:reviews -- greek/module1
git add curriculum && git commit -m "Robot reviews" && git push
```
