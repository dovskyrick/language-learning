/**
 * Build a robot-voice syllable library for a module (offline, free, no LLM).
 * Every clip is said directly, nothing is cut. Two robots:
 *   --robot espeak  (default) eSpeak NG formant voice   → library "robot"
 *   --robot mbrola  eSpeak + MBROLA gr2 diphone voice   → library "robot-mbrola"
 *                   (more human; MBROLA voice license is non-commercial)
 *
 *   npm run syllables -- greek/module1 [--robot espeak|mbrola] [--dry-run] [--only i006,i017] [--limit 5]
 *                        [--voice el] [--speed 140] [--pitch 50] [--library robot]
 *
 * Output: output/syllables/<language>/<module>/<library>/{manifest.json,<id>/*.mp3}
 *
 * The old OpenAI version (one-word and one-syllable TTS clips) was dropped:
 * short TTS inputs came back silent or garbled. It is in git history before
 * the "Remove syllable LLM TTS" commit. Full phrases still use OpenAI TTS.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Item, Lesson } from '../curriculum/types.js';
import { encodeMp3, SAMPLE_RATE, trim } from './audio-io.js';
import { Clip, SyllableManifest, WordEntry } from './manifest.js';
import { plain, syllabify } from './syllabify.js';
import { checkEspeak, robotSay, RobotVoice } from './robot.js';

const ms = (pcm: Float32Array) => Math.round((pcm.length / SAMPLE_RATE) * 1000);

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--robot', '--voice', '--speed', '--pitch', '--library', '--only', '--limit'];
const target = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const PRESETS: Record<string, { voice: string; library: string }> = {
  espeak: { voice: 'el', library: 'robot' },
  mbrola: { voice: 'mb-gr2', library: 'robot-mbrola' },
};
const preset = PRESETS[flag('--robot') ?? 'espeak'];
if (!preset) { console.error(`--robot must be one of: ${Object.keys(PRESETS).join(', ')}`); process.exit(1); }
const robot: RobotVoice = { voice: flag('--voice') ?? preset.voice, speed: Number(flag('--speed') ?? 140), pitch: Number(flag('--pitch') ?? 50) };
const library = flag('--library') ?? preset.library;
if (!target) { console.error('Usage: npm run syllables -- <language>/<module> [--robot espeak|mbrola] [--dry-run] [--only ids] [--limit n]'); process.exit(1); }
const [language, module] = target.split('/');

const curDir = resolve('curriculum', language, module);
const outDir = resolve('output', 'syllables', language, module, library);

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

function buildWord(item: Item, pieces: string[]): WordEntry {
  const syl = syllabify(item.target);
  const dir = join(outDir, item.id);
  mkdirSync(dir, { recursive: true });
  const clips: Clip[] = [];
  const save = (key: string, kind: Clip['kind'], text: string) => {
    const pcm = trim(robotSay(text, robot));
    encodeMp3(pcm, join(dir, `${key}.mp3`));
    clips.push({ key, kind, text, path: `${item.id}/${key}.mp3`, ms: ms(pcm) });
  };
  save('whole', 'whole', item.target.replace(/[.;!?]+$/, ''));
  // Pieces: key says how many syllables from the end each one covers.
  for (const piece of [...pieces].sort((a, b) => plain(a).length - plain(b).length)) {
    let k = 0;
    for (let n = 1; n < syl.length; n++) if (plain(syl.slice(syl.length - n).join('')) === plain(piece)) k = n;
    save(k ? `p${k}-tts` : `p-${plain(piece)}-tts`, 'piece-tts', piece);
  }
  syl.forEach((s, i) => save(`s${i + 1}`, 'syllable', s));
  const entry: WordEntry = {
    id: item.id, word: item.target, meaning: item.meaning, syllables: syl,
    variant: `espeak ${robot.voice} speed ${robot.speed}`, auto: { ok: true }, clips,
  };
  if (item.syllables && item.syllables !== syl.length) entry.expectedSyllables = item.syllables;
  return entry;
}

function main() {
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
  checkEspeak(robot.voice);

  const entries = words.map(({ item, pieces }) => {
    const e = buildWord(item, pieces);
    console.log(`✓ ${item.id} ${e.syllables.join('-')}`);
    return e;
  });
  const manifest: SyllableManifest = {
    version: 1, language, module, generatedAt: new Date().toISOString(), model: robot.voice.startsWith('mb-') ? 'espeak-ng + mbrola' : 'espeak-ng',
    voice: `${robot.voice} speed ${robot.speed} pitch ${robot.pitch}`, engine: 'robot', library, words: entries,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n${entries.length} words voiced. Manifest: ${join(outDir, 'manifest.json')}`);
  console.log(`Next: npm run syllables:upload -- ${target} --library ${library}`);
}

main();
