/**
 * Upload the syllable library to Firebase Storage (admin-only folder).
 *   npm run syllables:upload -- greek/module1   (default library robot-mbrola; --library robot for the frozen eSpeak one)
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { initAdmin, storagePrefix } from './firebase-admin.js';

const target = process.argv[2];
if (!target) { console.error('Usage: npm run syllables:upload -- <language>/<module> [--library robot-mbrola]'); process.exit(1); }
const [language, module] = target.split('/');
const li = process.argv.indexOf('--library');
const library = li > 0 ? process.argv[li + 1] : 'robot-mbrola';
const dir = resolve('output', 'syllables', language, module, library);
const prefix = [storagePrefix(language, module), library].filter(Boolean).join('/');

/** Every file of one library; other libraries (subfolders with their own manifest) are skipped. */
function files(d: string, root = true): string[] {
  if (!root && existsSync(join(d, 'manifest.json'))) return [];
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (f === '_raw') return [];
    return statSync(p).isDirectory() ? files(p, false) : [p];
  });
}

async function main() {
  const bucket = initAdmin().storage().bucket();
  const all = files(dir);
  if (!all.some((f) => f.endsWith('manifest.json'))) throw new Error(`No manifest in ${dir}. Run npm run syllables first.`);
  let n = 0;
  for (const f of all) {
    const dest = `${prefix}/${relative(dir, f)}`;
    const isJson = f.endsWith('.json');
    await bucket.upload(f, {
      destination: dest,
      // no-cache: after a re-upload the phone must never play an old cached clip
      metadata: { contentType: isJson ? 'application/json' : 'audio/mpeg', cacheControl: 'no-cache' },
    });
    if (++n % 50 === 0) console.log(`  ${n}/${all.length}`);
  }
  console.log(`✓ uploaded ${n} files to ${prefix}/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
