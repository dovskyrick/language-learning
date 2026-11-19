import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syllabify } from './syllabify.js';
import { split, splitFrame, tighten } from './splitter.js';

test('Greek syllables follow speech', () => {
  const cases: Record<string, string> = {
    ευχαριστώ: 'ευ-χα-ρι-στώ', παρακαλώ: 'πα-ρα-κα-λώ', Θεσσαλονίκη: 'Θεσ-σα-λο-νί-κη',
    γιατρός: 'για-τρός', ήλιος: 'ή-λιος', Μαρία: 'Μα-ρί-α', Κυριακή: 'Κυ-ρια-κή',
    εστιατόριο: 'ε-στια-τό-ριο', ξενοδοχείο: 'ξε-νο-δο-χεί-ο', αριθμός: 'α-ριθ-μός',
    Δευτέρα: 'Δευ-τέ-ρα', πρωινό: 'πρω-ι-νό', καταλαβαίνω: 'κα-τα-λα-βαί-νω',
  };
  for (const [w, s] of Object.entries(cases)) assert.equal(syllabify(w).join('-'), s, w);
  assert.deepEqual(syllabify('Τι ώρα είναι;'), ['Τι', 'ώ', 'ρα', 'εί', 'ναι']);
});

const SR = 24000;
/** Tone bursts (syllables) separated by silences, like a hyphenated TTS take. */
function fake(sylMs: number[], gapMs: number[]): { pcm: Float32Array; gaps: [number, number][] } {
  const parts: number[] = [];
  const gaps: [number, number][] = [];
  parts.push(...new Array(SR * 0.1).fill(0));
  sylMs.forEach((ms, i) => {
    for (let n = 0; n < (SR * ms) / 1000; n++) parts.push(0.5 * Math.sin((2 * Math.PI * 220 * n) / SR));
    if (i < gapMs.length) {
      const s = parts.length;
      parts.push(...new Array((SR * gapMs[i]) / 1000).fill(0.001 * Math.random()));
      gaps.push([s, parts.length]);
    }
  });
  parts.push(...new Array(SR * 0.1).fill(0));
  return { pcm: Float32Array.from(parts), gaps };
}

test('splitter cuts in the middle of each silence', () => {
  const { pcm, gaps } = fake([200, 180, 250, 300], [120, 90, 150]);
  const r = split(pcm, 4, { sampleRate: SR });
  assert.ok(r.ok, r.reason);
  r.cuts.forEach((c, i) => {
    const mid = (gaps[i][0] + gaps[i][1]) / 2;
    assert.ok(Math.abs(c - mid) <= SR * 0.01, `cut ${i} off by ${(c - mid) / SR}s`);
  });
});

test('splitter fails when TTS ran syllables together', () => {
  const { pcm } = fake([200, 180, 250], [120]);
  const r = split(pcm, 4, { sampleRate: SR });
  assert.equal(r.ok, false);
  assert.match(r.reason!, /need 3/);
});

test('tighten shrinks gaps to 40 ms', () => {
  const { pcm } = fake([200, 200], [200]);
  const r = split(pcm, 2, { sampleRate: SR });
  const out = tighten(pcm, r.speech.start, r.speech.end, r.silences, SR);
  const removed = (r.speech.end - r.speech.start - out.length) / SR;
  assert.ok(Math.abs(removed - 0.16) < 0.02, `removed ${removed}s`);
});

test('frame splitter finds the sentence pauses around "Word. sy-lla-bles. Word."', () => {
  // whole word (with a 70 ms stop closure inside) · 3 syllables · whole word again
  const { pcm, gaps } = fake([250, 250, 200, 180, 250, 250, 250], [70, 400, 120, 90, 400, 70]);
  const f = splitFrame(pcm, 2, { sampleRate: SR });
  assert.ok(f.ok, f.reason);
  const mid = (g: [number, number]) => (g[0] + g[1]) / 2;
  assert.ok(Math.abs(f.middle.start - mid(gaps[1])) < SR * 0.01, 'left cut at first sentence pause');
  assert.ok(Math.abs(f.middle.end - mid(gaps[4])) < SR * 0.01, 'right cut at second sentence pause');
  const r = split(pcm.slice(f.middle.start, f.middle.end), 3, { sampleRate: SR });
  assert.ok(r.ok, r.reason);
});

test('frame splitter keeps the middle copy of "ρα. ρα. ρα."', () => {
  const { pcm, gaps } = fake([200, 210, 190], [350, 330]);
  const f = splitFrame(pcm, 0, { sampleRate: SR });
  assert.ok(f.ok, f.reason);
  assert.ok(f.middle.start < gaps[0][1] && f.middle.end > gaps[1][0]);
});
