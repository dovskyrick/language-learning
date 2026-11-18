/**
 * Firebase web config. The API key is public by design (it is in the player app too);
 * access is enforced by Firebase Auth + the admin claim in Storage/Firestore rules.
 */
export const FIREBASE = {
  apiKey: 'AIzaSyD-T30gzwYcCyevxivxUVjY2A2it5NiK6w',
  projectId: 'jim-c9df8',
  storageBucket: 'jim-c9df8.firebasestorage.app',
};

/** Syllable libraries you can open. Add one per module after `npm run syllables:upload`. */
export const MODULES = [{ language: 'greek', module: 'module1', title: 'Greek · Module 1' }];

export const storagePrefix = (language: string, module: string) => `syllable-audio/${language}/${module}`;
export const REVIEWS = 'syllableReviews';
