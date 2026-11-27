/**
 * Hybrid lesson renderer (P0 in company/product/architecture-lesson-engine.md).
 * Lesson JSON → one clip per line (OpenAI or MBROLA robot, see voices.ts)
 * → trimmed, loudness-matched, each followed by its pause → one mp3 + timeline.
 *
 *   npm run lesson:render -- greek/module1 1            render lesson 1 (needs OPENAI_API_KEY)
 *   npm run lesson:render -- greek/module1 1 --dry-run  who says what, and the OpenAI cost
 *   npm run lesson:render -- greek/module1 1 --preview  offline: eSpeak stands in for OpenAI
 *
 * Output: output/lessons/<language>/<module>/lessonNN.mp3 (+ .timeline.json)
 *         (--preview writes lessonNN.preview.mp3; never upload those)
 * OpenAI clips are cached in output/tts-cache/, so re-renders only pay for changed lines.
 *
 * Env: TTS_MODEL (tts-1), NARRATOR_VOICE (alloy), TARGET_VOICE (alloy), TARGET_SPEED (1)
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Item, Lesson } from '../curriculum/types.js';
import { decode, encodeMp3, SAMPLE_RATE, trim } from '../syllables/audio-io.js';
import { checkEspeak, robotSay, RobotVoice } from '../syllables/robot.js';
import { CostTracker } from '../cost-tracker.js';
import { voiceFor, Voicing } from './voices.js';
import { levelTo, silence, speechDb } from './loudness.js';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const [target, lessonArg] = pos;
const dryRun = args.includes('--dry-run');
const preview = args.includes('--preview');
if (!target || !lessonArg) {
  console.error('Usage: npm run lesson:render -- <language>/<module> <lesson> [--dry-run] [--preview]');
  process.exit(1);
}
const [language, module] = target.split('/');
const n = Number(lessonArg);
const nn = String(n).padStart(2, '0');

const MODEL = process.env.TTS_MODEL || 'tts-1';
const VOICE = { narrator: process.env.NARRATOR_VOICE || 'alloy', target: process.env.TARGET_VOICE || 'alloy' };
const SPEED = { narrator: 1, target: Number(process.env.TARGET_SPEED || 1) };
const ROBOT: RobotVoice = { voice: 'mb-gr2', speed: 140, pitch: 50 };
const PREVIEW_VOICE = { narrator: 'en', target: 'el' };
const LEAD_IN = 0.5; // seconds of silence at the very start

const curDir = resolve('curriculum', language, module);
const outDir = resolve('output', 'lessons', language, module);
const cacheDir = resolve('output', 'tts-cache');

let client: OpenAI | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cacheFile = (v: Voicing) =>
  join(cacheDir, createHash('sha1').update(`${MODEL}|${VOICE[v.role]}|${SPEED[v.role]}|${v.text}`).digest('hex').slice(0, 16) + '.mp3');

/** One OpenAI request, cached on disk. Retries rate limits and server errors with backoff. */
async function openai(v: Voicing, costs: CostTracker): Promise<Float32Array> {
  const file = cacheFile(v);
  if (existsSync(file)) return decode(file);
  if (!costs.canAfford(v.text)) throw new Error('Budget limit reached (cost-tracker.json). Nothing more was sent.');
  client ??= new OpenAI({ maxRetries: 0 });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.audio.speech.create({
        model: MODEL, voice: VOICE[v.role] as 'alloy', input: v.text, speed: SPEED[v.role], response_format: 'mp3',
      });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      costs.recordRequest(v.text, language, module, `lesson${nn}`);
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

async function voice(v: Voicing, costs: CostTracker): Promise<Float32Array> {
  if (v.engine === 'robot') return robotSay(v.text, ROBOT);
  if (preview) return robotSay(v.text, { voice: PREVIEW_VOICE[v.role], speed: 160, pitch: 50 });
  return openai(v, costs);
}

async function main() {
  const lessonPath = join(curDir, 'lessons', `lesson${nn}.json`);
  if (!existsSync(lessonPath)) throw new Error(`No lesson at ${lessonPath}`);
  const lesson: Lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'));
  if (lesson.status === 'draft') throw new Error(`Lesson ${n} is a draft. Run: npm run curriculum -- check ${target} ${n}`);
  const items: Item[] = JSON.parse(readFileSync(join(curDir, 'items.json'), 'utf-8'));
  const byId = new Map(items.map((i) => [i.id, i]));

  const plan = lesson.lines.map((line) => ({ line, v: voiceFor(line, byId) }));
  const voiced = plan.filter((p) => p.v) as { line: Lesson['lines'][number]; v: Voicing }[];
  const toOpenAI = voiced.filter((p) => p.v.engine === 'openai');
  const uniq = new Map(toOpenAI.map((p) => [cacheFile(p.v), p.v.text]));
  const uncached = [...uniq].filter(([f]) => !existsSync(f));
  const costs = new CostTracker();
  const eur = uncached.reduce((s, [, t]) => s + costs.estimateCost(t), 0);
  const silent = plan.reduce((s, p) => s + p.line.pause, 0);

  console.log(`Lesson ${n}: ${lesson.title}  (${lesson.lines.length} lines, ${Math.round(silent / 60)} min of pauses)`);
  console.log(`  OpenAI: ${toOpenAI.length} lines, ${uniq.size} unique, ${uncached.length} not cached → ~€${eur.toFixed(3)}`);
  console.log(`  Robot:  ${voiced.length - toOpenAI.length} lines (MBROLA ${ROBOT.voice})`);
  if (dryRun) {
    for (const { line, v } of voiced) console.log(`  ${v.engine === 'robot' ? '🤖' : '🗣 '} ${v.reason.padEnd(14)} ${v.text}${line.pause ? `  [${line.pause}s]` : ''}`);
    return;
  }
  checkEspeak(ROBOT.voice);
  if (!preview && uncached.length && !process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env, or use --preview');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  // Voice every line once (identical lines reuse the same clip).
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
        pcm = levelTo(trim(await voice(v, costs)));
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
  console.log(`✓ ${base}.mp3  (${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')})`);
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });
