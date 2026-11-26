/**
 * Download your BackOffice ratings into the repo, so the pipeline can use them.
 *   npm run syllables:reviews -- greek/module1
 * → curriculum/<language>/<module>/syllable-reviews.json
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { initAdmin, REVIEWS } from './firebase-admin.js';

const target = process.argv[2];
if (!target) { console.error('Usage: npm run syllables:reviews -- <language>/<module>'); process.exit(1); }
const [language, module] = target.split('/');

async function main() {
  const db = initAdmin().firestore();
  const snap = await db.collection(REVIEWS).where('language', '==', language).where('module', '==', module).get();
  const reviews = snap.docs.map((d) => d.data()).sort((a, b) => `${a.wordId}${a.clipKey}`.localeCompare(`${b.wordId}${b.clipKey}`));
  const out = resolve('curriculum', language, module, 'syllable-reviews.json');
  writeFileSync(out, JSON.stringify({ note: 'Exported from the BackOffice app. Do not edit by hand.', reviews }, null, 2) + '\n');
  const count = (r: string) => reviews.filter((x) => x.rating === r).length;
  console.log(`✓ ${reviews.length} reviews (good ${count('good')}, ok ${count('ok')}, bad ${count('bad')}) → ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
