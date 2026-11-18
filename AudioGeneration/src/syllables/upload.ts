/**
 * Upload the syllable library to Firebase Storage (admin-only folder).
 *   npm run syllables:upload -- greek/module1
 */
import { readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { initAdmin, storagePrefix } from './firebase-admin.js';

const target = process.argv[2];
if (!target) { console.error('Usage: npm run syllables:upload -- <language>/<module>'); process.exit(1); }
const [language, module] = target.split('/');
const dir = resolve('output', 'syllables', language, module);

function files(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (f === '_raw') return [];
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

async function main() {
  const bucket = initAdmin().storage().bucket();
  const all = files(dir);
  if (!all.some((f) => f.endsWith('manifest.json'))) throw new Error(`No manifest in ${dir}. Run npm run syllables first.`);
  let n = 0;
  for (const f of all) {
    const dest = `${storagePrefix(language, module)}/${relative(dir, f)}`;
    const isJson = f.endsWith('.json');
    await bucket.upload(f, {
      destination: dest,
      metadata: { contentType: isJson ? 'application/json' : 'audio/mpeg', cacheControl: isJson ? 'no-cache' : 'private, max-age=3600' },
    });
    if (++n % 50 === 0) console.log(`  ${n}/${all.length}`);
  }
  console.log(`✓ uploaded ${n} files to ${storagePrefix(language, module)}/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
