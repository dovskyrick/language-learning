import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Item, Line } from '../curriculum/types.js';
import { voiceFor } from './voices.js';
import { levelTo, speechDb } from './loudness.js';

const items = new Map<string, Item>([
  ['i006', { id: 'i006', target: 'Ευχαριστώ.', meaning: 'thank you', type: 'word', lesson: 1 }],
  ['i001', { id: 'i001', target: 'Γεια σας.', meaning: 'hello', type: 'phrase', lesson: 1 }],
]);
const line = (l: Partial<Line>): Line => ({ beat: 'b1', pause: 1, ...l });

test('instructor lines go to OpenAI as narrator', () => {
  assert.deepEqual(voiceFor(line({ say: 'Repeat after the voice.' }), items)?.engine, 'openai');
  assert.equal(voiceFor(line({ say: 'Hi' }), items)?.role, 'narrator');
});

test('multi-word targets go to OpenAI, punctuation kept', () => {
  const v = voiceFor(line({ target: 'Θέλω έναν καφέ, παρακαλώ.', items: ['i004'] }), items)!;
  assert.equal(v.engine, 'openai');
  assert.equal(v.text, 'Θέλω έναν καφέ, παρακαλώ.');
});

test('single words and build-up pieces go to the robot, bare', () => {
  assert.deepEqual(voiceFor(line({ target: 'Ναι.', items: ['i007'] }), items), { engine: 'robot', role: 'target', text: 'Ναι', reason: 'single word' });
  const p = voiceFor(line({ target: 'ριστώ…', items: ['i006'] }), items)!;
  assert.equal(p.engine, 'robot');
  assert.equal(p.reason, 'build-up piece');
  assert.equal(p.text, 'ριστώ');
});

test('voice override wins', () => {
  assert.equal(voiceFor(line({ target: 'Ναι.', voice: 'openai' }), items)?.engine, 'openai');
  assert.equal(voiceFor(line({ target: 'Γεια σας.', voice: 'robot' }), items)?.engine, 'robot');
});

test('empty lines are silent', () => {
  assert.equal(voiceFor(line({}), items), null);
});

test('levelTo brings quiet and loud clips to the same speech level', () => {
  const tone = (amp: number) => Float32Array.from({ length: 24000 }, (_, i) => amp * Math.sin(i / 5));
  const a = speechDb(levelTo(tone(0.02))), b = speechDb(levelTo(tone(0.5)));
  assert.ok(Math.abs(a - b) < 0.5, `${a} vs ${b}`);
  assert.ok(Math.abs(a - -20) < 0.5);
});

test('manifest upsert adds Greek · Module 1 lessons in order and replaces on re-upload', async () => {
  const { upsertLessonInto } = await import('./manifest.js');
  const config = { language: 'greek', languageName: 'Greek', module: 'module1' } as never;
  const m: import('../types.js').Manifest = { languages: [{ id: 'greek', name: 'Greek', levels: [{ id: 'level1', name: 'Level 1', lessons: [] }] }] };
  upsertLessonInto(m, config, 2, 'Ordering more', 'audio-lessons/greek-module1-lesson02.mp3');
  upsertLessonInto(m, config, 1, 'At the café', 'audio-lessons/greek-module1-lesson01.mp3');
  upsertLessonInto(m, config, 1, 'At the café!', 'audio-lessons/greek-module1-lesson01.mp3');
  const level = m.languages[0].levels.find((l) => l.id === 'module1')!;
  assert.equal(level.name, 'Module 1');
  assert.deepEqual(level.lessons.map((l) => l.title), ['Lesson 1 · At the café!', 'Lesson 2 · Ordering more']);
  assert.equal(m.languages[0].levels.length, 2, 'old level kept');
});
