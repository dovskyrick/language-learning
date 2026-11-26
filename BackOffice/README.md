# Jim BackOffice

Android app for admins: listen to the syllable library and rate each clip (✓ good, ~ ok, ✗ bad, plus tags and a note). It uses the same audio engine as the lesson player (expo-av). Ratings are saved in Firestore and pulled into the repo for the pipeline.

**Access:** sign in with a Firebase email account that has the `admin` claim. Storage (`syllable-audio/`) and Firestore (`syllableReviews`) rules reject everyone else, so the APK can be public.

## One-time setup (you, about 10 minutes)
1. **Firebase console → Authentication → Sign-in method:** enable *Email/Password*. Then go to **Users → Add user** with your email and a strong password.
2. **Firebase console → Firestore Database → Create database** (production mode, any EU/US region).
3. On your computer, from `AudioGeneration/`, with `firebase-service-account.json` in place:
   ```bash
   npm run set-admin -- you@example.com
   ```
4. Deploy the rules from `CloudFunctions/`:
   ```bash
   firebase deploy --only storage,firestore:rules
   ```

## Each time you make new audio
```bash
cd AudioGeneration
npm run syllables -- greek/module1                                # robot 1, eSpeak NG: free, offline, ~20 s
npm run syllables:upload -- greek/module1                         # → syllable-audio/greek/module1/robot/
npm run syllables:mbrola -- greek/module1                         # robot 2, MBROLA gr2 (needs: sudo apt install mbrola mbrola-gr2)
npm run syllables:upload -- greek/module1 --library robot-mbrola  # → syllable-audio/greek/module1/robot-mbrola/
# …rate in the app…
npm run syllables:reviews -- greek/module1    # → curriculum/greek/module1/syllable-reviews.json
```
`npm run syllables -- greek/module1 --dry-run` prints the syllables and pieces without spending anything.

## Get the APK
Every push that touches `BackOffice/` runs **Actions → BackOffice APK**. Open the run, download **jim-backoffice-apk** under *Artifacts*, unzip it, and install the `.apk` on your phone (allow installs from your browser or file manager). You can also run it by hand: **Actions → BackOffice APK → Run workflow**.

## What you see
- **Word list:** each build-up word with its syllables and how many clips you have rated. Filters: *To rate*, *Has bad*. At the top, a scoreboard shows how good the robot is per clip type (whole word, syllable, piece).
- **Word:** "▶ Build-up" plays the pieces shortest-first and then the whole word, as a lesson would. Below that is every clip: whole word, each piece, and each syllable. Each has a play button and ✓ ~ ✗ buttons; ~ or ✗ opens tags and a note.
- **Library switch** at the top of the list: *Robot · eSpeak* or *Robot · MBROLA*. Ratings are kept separately per library, so you can compare the two.
- The old OpenAI one-word / one-syllable library was dropped (short TTS clips came out garbled).
- License note: eSpeak NG is GPLv3. The MBROLA gr2 voice data is non-commercial only, so ask before shipping it in a paid release.

Develop locally with `npm install && npx expo run:android` (needs Android Studio), or rely on the CI build.
