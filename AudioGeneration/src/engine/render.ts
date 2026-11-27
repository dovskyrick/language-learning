/**
 * Hybrid lesson renderer (P0 in company/product/architecture-lesson-engine.md).
 * Lesson JSON → one clip per line (OpenAI or MBROLA robot, see voices.ts)
 * → trimmed, loudness-matched, each followed by its pause → one mp3 + timeline.
 *
 *   npm run lesson:render -- greek/module1 1              render lesson 1 (needs OPENAI_API_KEY)
 *   npm run lesson:render -- greek/module1 1-30           a range; also "all"
 *   npm run lesson:render -- greek/module1 all --dry-run  who says what, and the OpenAI cost
 *   npm run lesson:render -- greek/module1 1 --preview    offline: eSpeak stands in for OpenAI
 *   npm run lesson:render -- greek/module1 all --upload   render, upload, update manifest.json
 *
 * Output: output/lessons/<language>/<module>/lessonNN.mp3 (+ .timeline.json)
 *         (--preview writes lessonNN.preview.mp3, which is never uploaded)
 * Upload: audio-lessons/<language>-<module>-lessonNN.mp3, lesson-metadata/…timeline.json,
 *         and the lesson is added to ../manifest.json, which is uploaded once at the end.
 * OpenAI clips are cached in output/tts-cache/, so re-renders only pay for changed lines.
 *
 * Env: TTS_MODEL (tts-1), NARRATOR_VOICE (alloy), TARGET_VOICE (alloy), TARGET_SPEED (1)
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Item, Lesson, ModuleConfig } from '../curriculum/types.js';
import { decode, encodeMp3, SAMPLE_RATE, trim } from '../syllables/audio-io.js';
import { checkEspeak, robotSay, RobotVoice } from '../syllables/robot.js';
import { CostTracker } from '../cost-tracker.js';
import { voiceFor, Voicing } from './voices.js';
import { levelTo, silence, speechDb } from './loudness.js';
import { upsertLesson } from './manifest.js';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const [target, lessonArg] = pos;
const dryRun = args.includes('--dry-run');
const preview = args.includes('--preview');
const upload = args.includes('--upload');
if (!target || !lessonArg) {
  console.error('Usage: npm run lesson:render -- <language>/<module> <N | A-B | all> [--dry-run] [--preview] [--upload]');
  process.exit(1);
}
if (upload && (preview || dryRun)) { console.error('--upload cannot be combined with --preview or --dry-run'); process.exit(1); }
const [language, module] = target.split('/');

const MODEL = process.env.TTS_MODEL || 'tts-1';
const VOICE = { narrator: process.env.NARRATOR_VOICE || 'alloy', target: process.env.TARGET_VOICE || 'alloy' };
const SPEED = { narrator: 1, target: Number(process.env.TARGET_SPEED || 1) };
const ROBOT: RobotVoice = { voice: 'mb-gr2', speed: 140, pitch: 50 };
const PREVIEW_VOICE = { narrator: 'en', target: 'el' };
const LEAD_IN = 0.5; // seconds of silence at the very start

const curDir = resolve('curriculum', language, module);
const outDir = resolve('output', 'lessons', language, module);
const cacheDir = resolve('output', 'tts-cache');
const pad2 = (n: number) => String(n).padStart(2, '0');

let client: OpenAI | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cacheFile = (v: Voicing) =>
  join(cacheDir, createHash('sha1').update(`${MODEL}|${VOICE[v.role]}|${SPEED[v.role]}|${v.text}`).digest('hex').slice(0, 16) + '.mp3');

class BudgetError extends Error {}

/** One OpenAI request, cached on disk. Retries rate limits and server errors with backoff. */
async function openai(v: Voicing, costs: CostTracker, lessonId: string): Promise<Float32Array> {
  const file = cacheFile(v);
  if (existsSync(file)) return decode(file);
  if (!costs.canAfford(v.text)) throw new BudgetError('Budget limit reached (cost-tracker.json). Nothing more was sent.');
  client ??= new OpenAI({ maxRetries: 0 });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.audio.speech.create({
        model: MODEL, voice: VOICE[v.role] as 'alloy', input: v.text, speed: SPEED[v.role], response_format: 'mp3',
      });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      costs.recordRequest(v.text, language, module, lessonId);
      await sleep(300);
      return decode(file);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      if (attempt >= 5 || (status && status !== 429 && status < 500)) throw e;
      const wait = 2000 * 2 ** attempt;
      console.log(`  ⏳ OpenAI error ${status || 'network'}, retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

function voice(v: Voicing, costs: CostTracker, lessonId: string): Promise<Float32Array> | Float32Array {
  if (v.engine === 'robot') return robotSay(v.text, ROBOT);
  if (preview) return robotSay(v.text, { voice: PREVIEW_VOICE[v.role], speed: 160, pitch: 50 });
  return openai(v, costs, lessonId);
}

function lessonNumbers(spec: string, count: number): number[] {
  if (spec === 'all') return Array.from({ length: count }, (_, i) => i + 1);
  const m = spec.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Lesson must be N, A-B or all (got "${spec}")`);
  const a = Number(m[1]), b = Number(m[2] ?? m[1]);
  if (a < 1 || b > count || a > b) throw new Error(`Lessons go from 1 to ${count}`);
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

interface Rendered { n: number; title: string; mp3: string; timeline: string; seconds: number }

async function renderLesson(n: number, byId: Map<string, Item>, costs: CostTracker): Promise<Rendered | null> {
  const nn = pad2(n);
  const lessonPath = join(curDir, 'lessons', `lesson${nn}.json`);
  if (!existsSync(lessonPath)) { console.log(`Lesson ${n}: no file, skipped`); return null; }
  const lesson: Lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'));
  if (lesson.status === 'draft') { console.log(`Lesson ${n}: still a draft, skipped (npm run curriculum -- check ${target} ${n})`); return null; }

  const plan = lesson.lines.map((line) => ({ line, v: voiceFor(line, byId) }));
  const voiced = plan.filter((p) => p.v) as { line: Lesson['lines'][number]; v: Voicing }[];
  const toOpenAI = voiced.filter((p) => p.v.engine === 'openai');
  const uniq = new Map(toOpenAI.map((p) => [cacheFile(p.v), p.v.text]));
  const uncached = [...uniq].filter(([f]) => !existsSync(f));
  const eur = uncached.reduce((s, [, t]) => s + costs.estimateCost(t), 0);
  const silent = plan.reduce((s, p) => s + p.line.pause, 0);

  console.log(`\nLesson ${n}: ${lesson.title}  (${lesson.lines.length} lines, ${Math.round(silent / 60)} min of pauses)`);
  console.log(`  OpenAI: ${toOpenAI.length} lines, ${uniq.size} unique, ${uncached.length} not cached → ~€${eur.toFixed(3)}`);
  console.log(`  Robot:  ${voiced.length - toOpenAI.length} lines (MBROLA ${ROBOT.voice})`);
  if (dryRun) {
    if (pos[1] !== 'all' && !pos[1].includes('-')) {
      for (const { line, v } of voiced) console.log(`  ${v.engine === 'robot' ? '🤖' : '🗣 '} ${v.reason.padEnd(14)} ${v.text}${line.pause ? `  [${line.pause}s]` : ''}`);
    }
    return null;
  }

  const clips = new Map<string, Float32Array>();
  const warnings: string[] = [];
  const timeline: { line: number; start: number; end: number; engine: string; text: string }[] = [];
  const parts: Float32Array[] = [silence(LEAD_IN)];
  let t = LEAD_IN;
  for (let i = 0; i < plan.length; i++) {
    const { line, v } = plan[i];
    if (v) {
      const key = `${v.engine}|${v.role}|${v.text}`;
      let pcm = clips.get(key);
      if (!pcm) {
        pcm = levelTo(trim(await voice(v, costs, `lesson${nn}`)));
        if (pcm.length < 0.08 * SAMPLE_RATE || !isFinite(speechDb(pcm))) warnings.push(`line ${i + 1} "${v.text}" (${v.engine}) is silent or too short`);
        clips.set(key, pcm);
        if (process.stdout.isTTY) process.stdout.write(`\r  voiced ${clips.size} clips (line ${i + 1}/${plan.length})   `);
      }
      parts.push(pcm);
      const dur = pcm.length / SAMPLE_RATE;
      timeline.push({ line: i, start: +t.toFixed(3), end: +(t + dur).toFixed(3), engine: preview && v.engine === 'openai' ? 'preview' : v.engine, text: v.text });
      t += dur;
    }
    parts.push(silence(line.pause));
    t += line.pause;
  }
  console.log(`${process.stdout.isTTY ? '\n' : ''}  ${clips.size} unique clips`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);

  const total = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { total.set(p, o); o += p.length; }

  const base = join(outDir, `lesson${nn}${preview ? '.preview' : ''}`);
  encodeMp3(total, `${base}.mp3`, '96k');
  writeFileSync(`${base}.timeline.json`, JSON.stringify({ language, module, lesson: n, title: lesson.title, durationSec: +t.toFixed(3), lines: timeline }, null, 2));
  console.log(`  ✓ ${base}.mp3  (${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')})`);
  return { n, title: lesson.title, mp3: `${base}.mp3`, timeline: `${base}.timeline.json`, seconds: t };
}

async function main() {
  const config: ModuleConfig = JSON.parse(readFileSync(join(curDir, 'module.json'), 'utf-8'));
  const items: Item[] = JSON.parse(readFileSync(join(curDir, 'items.json'), 'utf-8'));
  const byId = new Map(items.map((i) => [i.id, i]));
  const lessons = lessonNumbers(lessonArg, config.lessonCount);
  const costs = new CostTracker();

  if (!dryRun) {
    checkEspeak(ROBOT.voice);
    if (!preview && !process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env, or use --preview');
    mkdirSync(outDir, { recursive: true });
    mkdirSync(cacheDir, { recursive: true });
  }
  // Firebase is only loaded when uploading, so rendering never needs the service account.
  const storage = upload ? new (await import('../firebase-storage.js')).FirebaseStorageService() : null;

  const done: Rendered[] = [];
  try {
    for (const n of lessons) {
      const r = await renderLesson(n, byId, costs);
      if (!r) continue;
      done.push(r);
      if (storage) {
        const name = `${language}-${module}-lesson${pad2(n)}`;
        await storage.uploadFile(r.mp3, `audio-lessons/${name}.mp3`, 'audio/mpeg');
        await storage.uploadFile(r.timeline, `lesson-metadata/${name}.timeline.json`, 'application/json');
        upsertLesson(resolve('../manifest.json'), config, n, r.title, `audio-lessons/${name}.mp3`);
      }
    }
  } catch (e) {
    if (!(e instanceof BudgetError)) throw e;
    console.log(`\n✗ ${e.message} Stopped after ${done.length} lesson(s); re-run the same command to continue from the cache.`);
    process.exitCode = 1;
  } finally {
    if (storage && done.length) {
      await storage.uploadFile(resolve('../manifest.json'), 'manifest.json', 'application/json');
      console.log(`✓ manifest.json uploaded with ${done.length} new/updated lesson(s)`);
    }
  }
  if (lessons.length > 1 && done.length) {
    const min = done.reduce((s, r) => s + r.seconds, 0) / 60;
    console.log(`\n✓ ${done.length} lesson(s), ${Math.round(min)} min of audio${storage ? ', uploaded' : ''}.`);
  }
  if (dryRun && lessons.length > 1) console.log('\n(dry run: nothing generated; costs above are per lesson, phrases shared across lessons are counted in each)');
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });
