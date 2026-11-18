/** Firebase Admin with the service account file (never committed). */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from '../config.js';

export function initAdmin(): typeof admin {
  const file = resolve(config.firebase.serviceAccountPath);
  if (!existsSync(file)) throw new Error(`Firebase service account not found at ${file}`);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(file, 'utf-8'))),
      storageBucket: config.firebase.storageBucket,
    });
  }
  return admin;
}

/** Storage folder and Firestore collection shared with the BackOffice app. */
export const storagePrefix = (language: string, module: string) => `syllable-audio/${language}/${module}`;
export const REVIEWS = 'syllableReviews';
