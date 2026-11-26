/**
 * Firebase web config. The API key is public by design (it is in the player app too);
 * access is enforced by Firebase Auth + the admin claim in Storage/Firestore rules.
 */
export const FIREBASE = {
  apiKey: 'AIzaSyD-T30gzwYcCyevxivxUVjY2A2it5NiK6w',
  projectId: 'jim-c9df8',
  storageBucket: 'jim-c9df8.firebasestorage.app',
};

/**
 * Syllable libraries you can open (after `npm run syllables:upload`).
 * 'robot' = eSpeak NG, 'robot-mbrola' = MBROLA gr2. The switch in the word list shows when there is more than one.
 */
export interface Lib { id: string; title: string; language: string; module: string; library: string }
export const LIBRARIES: Lib[] = [
  { id: 'greek-module1-robot', title: 'Robot · eSpeak', language: 'greek', module: 'module1', library: 'robot' },
  { id: 'greek-module1-robot-mbrola', title: 'Robot · MBROLA', language: 'greek', module: 'module1', library: 'robot-mbrola' },
];

export const storagePrefix = (lib: Lib) => ['syllable-audio', lib.language, lib.module, lib.library].filter(Boolean).join('/');
export const REVIEWS = 'syllableReviews';
