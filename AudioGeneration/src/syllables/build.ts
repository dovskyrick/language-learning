/**
 * Build the syllable library for a module with Plan A
 * (hyphenated TTS, cut in the middle of each silence).
 *
 * TTS is never sent a lone word: short inputs come back silent or garbled.
 *  - Word + syllables are one request, framed by the whole word so the language
 *    is clear: "Ευχαριστώ. ευ-χα-ρι-στώ. Ευχαριστώ." The last copy becomes
 *    the whole-word clip; the middle is split into syllables.
 *  - Build-up pieces voiced alone (Plan 0) are sent three times: "ρα. ρα. ρα."
 *    and the middle copy is kept.
 *
 *   npm run syllables -- greek/module1 [--dry-run] [--only i006,i017] [--limit 5]
 *
 * Output: output/syllables/<language>/<module>/{manifest.json,<id>/*.mp3}
 * TTS takes are cached in _raw/, so re-running costs nothing.
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Item, Lesson } from '../curriculum/types.js';
import { decode, encodeMp3, SAMPLE_RATE } from './audio-io.js';
import { Clip, SyllableManifest, WordEntry } from './manifest.js';
import { analyze, fade, split, splitFrame, tighten } from './splitter.js';
import { plain, syllabify } from './syllabify.js';

const ms = (pcm: Float32Array) => Math.round((pcm.length / SAMPLE_RATE) * 1000);
const PAD = Math.round(0.05 * SAMPLE_RATE);

const MODEL = process.env.TTS_MODEL || 'tts-1';
const VOICE = process.env.TTS_VOICE || 'alloy';

const VARIANTS = [
  { name: 'hyphen', make: (s: string[]) => s.join('-'), speed: 1 },
  { name: 'hyphen-slow', make: (s: string[]) => s.join('-'), speed: 0.85 },
  { name: 'spaced-hyphen', make: (s: string[]) => s.join(' - '), speed: 1 },
  { name: 'dots', make: (s: string[]) => s.join('... '), speed: 1 },
];

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
if (!target) { console.error('Usage: npm run syllables -- <language>/<module> [--dry-run] [--only ids] [--limit n]'); process.exit(1); }
const [language, module] = target.split('/');

const curDir = resolve('curriculum', language, module);
const outDir = resolve('output', 'syllables', language, module);
const rawDir = join(outDir, '_raw');

/** Build-up words and their pieces, read from the lessons themselves. */
function buildUpWords(): { item: Item; pieces: string[] }[] {
  const items: Item[] = JSON.parse(readFileSync(join(curDir, 'items.json'), 'utf-8'));
  const byId = new Map(items.map((i) => [i.id, i]));
  const pieces = new Map<string, Set<string>>();
  const lessonDir = join(curDir, 'lessons');
  for (const f of readdirSync(lessonDir).filter((f) => f.endsWith('.json')).sort()) {
    const lesson: Lesson = JSON.parse(readFileSync(join(lessonDir, f), 'utf-8'));
    for (const line of lesson.lines) {
      if (!line.target || line.items?.length !== 1) continue;
      const item = byId.get(line.items[0]);
      if (!item) continue;
      const p = plain(line.target), w = plain(item.target);
      if (p && p !== w && w.endsWith(p)) {
        const set = pieces.get(item.id) ?? new Set();
        set.add(line.target.replace(/[.,;!?…]+$/g, '').trim());
        pieces.set(item.id, set);
      }
    }
  }
  return [...pieces].map(([id, set]) => ({ item: byId.get(id)!, pieces: [...set] }));
}

let client: OpenAI | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One TTS request, cached in _raw/. Retries rate limits and server errors with backoff. */
async function tts(text: string, speed: number): Promise<string> {
  const hash = createHash('sha1').update(`${MODEL}|${VOICE}|${speed}|${text}`).digest('hex').slice(0, 16);
  const file = join(rawDir, `${hash}.mp3`);
  if (existsSync(file)) return file;
  client ??= new OpenAI({ maxRetries: 0 });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.audio.speech.create({ model: MODEL, voice: VOICE as 'alloy', input: text, speed });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      await sleep(500); // be polite: no bursts
      return file;
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      if (attempt >= 5 || (status && status !== 429 && status < 500)) throw e;
      const wait = 2000 * 2 ** attempt;
      console.log(`  ⏳ TTS error ${status || 'network'}, retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

const OPTS = { sampleRate: SAMPLE_RATE };

/** Cut silence around a region, keeping a short pad, with fades. */
function trimmed(pcm: Float32Array): Float32Array {
  const { speech } = analyze(pcm, OPTS);
  if (!speech) return pcm;
  return fade(pcm.slice(Math.max(0, speech.start - PAD), Math.min(pcm.length, speech.end + PAD)), SAMPLE_RATE);
}

/** Voice a short text three times and keep the middle copy; falls back to a single request. */
async function voiceShort(text: string): Promise<Float32Array> {
  const full = decode(await tts(`${text}. ${text}. ${text}.`, 1));
  const f = splitFrame(full, 0, OPTS);
  if (f.ok) return trimmed(full.slice(f.middle.start, f.middle.end));
  return trimmed(decode(await tts(text, 1)));
}


async function buildWord(item: Item, pieces: string[]): Promise<WordEntry> {
  const syl = syllabify(item.target);
  const dir = join(outDir, item.id);
  mkdirSync(dir, { recursive: true });
  const clips: Clip[] = [];
  const save = (key: string, kind: Clip['kind'], text: string, pcm: Float32Array) => {
    encodeMp3(pcm, join(dir, `${key}.mp3`));
    clips.push({ key, kind, text, path: `${item.id}/${key}.mp3`, ms: ms(pcm) });
  };

  // One framed request per variant: "Word. syl-la-bles. Word."
  const word = item.target.replace(/[.;!?]+$/, '');
  type Take = { name: string; text: string; pcm: Float32Array; r: ReturnType<typeof split>; first?: Float32Array; lastCopy?: Float32Array };
  let chosen: Take | null = null;
  let last: Take | null = null;
  for (const v of VARIANTS) {
    const text = `${word}. ${v.make(syl)}. ${word}.`;
    const full = decode(await tts(text, v.speed));
    const f = splitFrame(full, syl.length - 1, OPTS);
    if (!f.ok) {
      last = { name: v.name, text, pcm: full, r: { ok: false, reason: `frame: ${f.reason}`, speech: { start: 0, end: full.length }, cuts: [], silences: [] } };
      continue;
    }
    const mid = full.slice(f.middle.start, f.middle.end);
    const take: Take = {
      name: v.name, text, pcm: mid, r: split(mid, syl.length, OPTS),
      first: trimmed(full.slice(f.left.start, f.left.end)), lastCopy: trimmed(full.slice(f.right.start, f.right.end)),
    };
    last = take;
    if (take.r.ok) { chosen = take; break; }
  }
  const use: Take = chosen ?? last!;
  const { pcm, r } = use;

  // Whole word: the last copy of the frame (natural falling end); the first copy kept to compare.
  if (use.lastCopy && use.first) {
    save('whole', 'whole', item.target, use.lastCopy);
    save('whole-first', 'whole', item.target, use.first);
  } else {
    save('whole', 'whole', item.target, await voiceShort(word));
  }

  const start = Math.max(0, r.speech.start - PAD);
  const end = Math.min(pcm.length, r.speech.end + PAD);
  save('take', 'take', use.text, pcm.slice(start, end));

  // Pieces: how many syllables from the end each one covers.
  const sorted = [...pieces].sort((a, b) => plain(a).length - plain(b).length);
  for (const piece of sorted) {
    let k = 0;
    for (let n = 1; n < syl.length; n++) if (plain(syl.slice(syl.length - n).join('')) === plain(piece)) k = n;
    const key = k ? `p${k}` : `p-${plain(piece)}`;
    save(`${key}-tts`, 'piece-tts', piece, await voiceShort(piece));
    if (!chosen || !k) continue;
    const from = r.cuts[syl.length - 1 - k];
    save(`${key}-a1`, 'piece-a1', piece, fade(pcm.slice(from, end), SAMPLE_RATE));
    save(`${key}-a2`, 'piece-a2', piece, fade(tighten(pcm, from, end, r.silences, SAMPLE_RATE), SAMPLE_RATE));
  }
  if (chosen) {
    const bounds = [start, ...r.cuts, end];
    syl.forEach((s, i) => save(`s${i + 1}`, 'syllable', s, fade(pcm.slice(bounds[i], bounds[i + 1]), SAMPLE_RATE)));
  }

  const entry: WordEntry = {
    id: item.id, word: item.target, meaning: item.meaning, syllables: syl,
    variant: chosen?.name ?? null,
    auto: chosen ? { ok: true } : { ok: false, reason: r.reason },
    clips,
  };
  if (item.syllables && item.syllables !== syl.length) entry.expectedSyllables = item.syllables;
  return entry;
}

async function main() {
  let words = buildUpWords();
  const only = flag('--only')?.split(',');
  if (only) words = words.filter((w) => only.includes(w.item.id));
  const limit = Number(flag('--limit') ?? 0);
  if (limit) words = words.slice(0, limit);

  if (dryRun) {
    for (const { item, pieces } of words) {
      const syl = syllabify(item.target);
      const warn = item.syllables && item.syllables !== syl.length ? `  ⚠ items.json says ${item.syllables}` : '';
      console.log(`${item.id}  ${syl.join('-').padEnd(28)} pieces: ${pieces.join(', ')}${warn}`);
    }
    console.log(`\n${words.length} words. Nothing generated (dry run).`);
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env');
  mkdirSync(rawDir, { recursive: true });

  const entries: WordEntry[] = [];
  for (const { item, pieces } of words) {
    const e = await buildWord(item, pieces);
    entries.push(e);
    console.log(`${e.auto.ok ? '✓' : '✗'} ${item.id} ${e.syllables.join('-')}  ${e.variant ?? e.auto.reason}`);
  }
  const manifest: SyllableManifest = {
    version: 1, language, module, generatedAt: new Date().toISOString(), model: MODEL, voice: VOICE, words: entries,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const ok = entries.filter((e) => e.auto.ok).length;
  console.log(`\n${ok}/${entries.length} words split cleanly. Manifest: ${join(outDir, 'manifest.json')}`);
  console.log('Next: npm run syllables:upload -- ' + target);
}

main().catch((e) => { console.error(e); process.exit(1); });
