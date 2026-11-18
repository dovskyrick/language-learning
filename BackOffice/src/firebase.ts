/**
 * Firebase over plain HTTPS: Auth (email + password), Storage and Firestore REST.
 * No Firebase SDK, so nothing to fight in the React Native bundler.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE, REVIEWS, storagePrefix } from './config';
import { Review, SyllableManifest } from './types';

interface Session { email: string; idToken: string; refreshToken: string; expiresAt: number; admin: boolean }
const SESSION_KEY = 'session-v1';
let session: Session | null = null;

function base64UrlDecode(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  let bits = 0, value = 0, out = '';
  for (const c of b64) {
    const v = chars.indexOf(c);
    if (v < 0) continue;
    value = (value << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out += '%' + ((value >> bits) & 0xff).toString(16).padStart(2, '0'); }
  }
  return decodeURIComponent(out); // bytes → UTF-8 text
}

function claims(idToken: string): Record<string, unknown> {
  try { return JSON.parse(base64UrlDecode(idToken.split('.')[1])); } catch { return {}; }
}

function makeSession(email: string, idToken: string, refreshToken: string, expiresIn: string): Session {
  return { email, idToken, refreshToken, expiresAt: Date.now() + (Number(expiresIn) - 60) * 1000, admin: claims(idToken).admin === true };
}

async function errorText(res: Response): Promise<string> {
  try {
    const j = await res.json();
    const msg: string = j?.error?.message ?? j?.[0]?.error?.message ?? `HTTP ${res.status}`;
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(msg)) return 'Wrong email or password.';
    if (/TOO_MANY_ATTEMPTS/.test(msg)) return 'Too many attempts. Wait a few minutes.';
    return msg;
  } catch { return `HTTP ${res.status}`; }
}

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const j = await res.json();
  session = makeSession(j.email, j.idToken, j.refreshToken, j.expiresIn);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function refresh(): Promise<void> {
  if (!session) throw new Error('Not signed in');
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
  });
  if (!res.ok) { await signOut(); throw new Error('Session expired. Sign in again.'); }
  const j = await res.json();
  session = makeSession(session.email, j.id_token, j.refresh_token, j.expires_in);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Restore the saved session; refreshes it so a new admin claim shows up. */
export async function restore(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  session = JSON.parse(raw);
  try { await refresh(); } catch { return null; }
  return session;
}

export async function signOut(): Promise<void> {
  session = null;
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function token(): Promise<string> {
  if (!session) throw new Error('Not signed in');
  if (Date.now() > session.expiresAt) await refresh();
  return session.idToken;
}

export const currentEmail = () => session?.email ?? '';

// ---------- Storage ----------

const objectUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${FIREBASE.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;

export async function clipSource(language: string, module: string, path: string) {
  return { uri: objectUrl(`${storagePrefix(language, module)}/${path}`), headers: { Authorization: `Firebase ${await token()}` } };
}

export async function fetchManifest(language: string, module: string): Promise<SyllableManifest> {
  const res = await fetch(objectUrl(`${storagePrefix(language, module)}/manifest.json`), {
    headers: { Authorization: `Firebase ${await token()}` },
  });
  if (res.status === 403) throw new Error('No access. Is your account an admin (npm run set-admin)?');
  if (res.status === 404) throw new Error('No syllable library uploaded yet (npm run syllables:upload).');
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

// ---------- Firestore ----------

const DOCS = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
export const reviewId = (r: Pick<Review, 'language' | 'module' | 'wordId' | 'clipKey'>) =>
  `${r.language}_${r.module}_${r.wordId}_${r.clipKey}`.replace(/[^A-Za-z0-9_-]/g, '-');

type FsValue = { stringValue?: string; arrayValue?: { values?: FsValue[] }; timestampValue?: string };
function toFields(r: Review): Record<string, FsValue> {
  const f: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(r)) {
    if (Array.isArray(v)) f[k] = { arrayValue: { values: v.map((s) => ({ stringValue: s })) } };
    else if (k === 'updatedAt') f[k] = { timestampValue: v as string };
    else f[k] = { stringValue: String(v) };
  }
  return f;
}
function fromFields(f: Record<string, FsValue>): Review {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    o[k] = v.arrayValue ? (v.arrayValue.values ?? []).map((x) => x.stringValue ?? '') : v.stringValue ?? v.timestampValue ?? '';
  }
  return o as unknown as Review;
}

export async function loadReviews(language: string, module: string): Promise<Map<string, Review>> {
  const eq = (field: string, value: string) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } });
  const res = await fetch(`${DOCS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: REVIEWS }],
        where: { compositeFilter: { op: 'AND', filters: [eq('language', language), eq('module', module)] } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Reviews: ${await errorText(res)}`);
  const rows: { document?: { fields: Record<string, FsValue> } }[] = await res.json();
  const map = new Map<string, Review>();
  for (const row of rows) if (row.document) { const r = fromFields(row.document.fields); map.set(reviewId(r), r); }
  return map;
}

export async function saveReview(r: Review): Promise<void> {
  const res = await fetch(`${DOCS}/${REVIEWS}/${reviewId(r)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(r) }),
  });
  if (!res.ok) throw new Error(`Save failed: ${await errorText(res)}`);
}
