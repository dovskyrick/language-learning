/**
 * Plan A splitter: find the silences TTS leaves between hyphenated syllables
 * and cut exactly in the middle of each one. Works on mono float PCM.
 */

export interface Silence { start: number; end: number } // sample indices, end exclusive

export interface SplitOptions {
  sampleRate: number;
  frameMs?: number;        // RMS frame, default 10
  thresholdDb?: number;    // silent if below (loudest frame − this), default 30
  minSilenceMs?: number;   // default 60
}

export interface SplitResult {
  ok: boolean;
  reason?: string;
  speech: { start: number; end: number };
  cuts: number[];          // N−1 cut samples
  silences: Silence[];     // the N−1 silences used, in time order
}

function frameDb(pcm: Float32Array, start: number, len: number): number {
  let sum = 0;
  const end = Math.min(pcm.length, start + len);
  for (let i = start; i < end; i++) sum += pcm[i] * pcm[i];
  const rms = Math.sqrt(sum / Math.max(1, end - start));
  return 20 * Math.log10(rms + 1e-9);
}

interface Analysis { speech: { start: number; end: number } | null; runs: Silence[] }

/** Speech region and every silent run of at least minSilenceMs inside it. */
export function analyze(pcm: Float32Array, o: SplitOptions): Analysis {
  const frame = Math.round(((o.frameMs ?? 10) / 1000) * o.sampleRate);
  const frames = Math.floor(pcm.length / frame);
  const db = Array.from({ length: frames }, (_, f) => frameDb(pcm, f * frame, frame));
  const loud = Math.max(...db);
  const thr = loud - (o.thresholdDb ?? 30);
  const silent = db.map((d) => d < thr);
  const first = silent.indexOf(false);
  const last = silent.lastIndexOf(false);
  if (first < 0) return { speech: null, runs: [] };
  const minFrames = Math.ceil((o.minSilenceMs ?? 60) / (o.frameMs ?? 10));
  const runs: Silence[] = [];
  for (let f = first; f <= last; f++) {
    if (!silent[f]) continue;
    let g = f;
    while (g <= last && silent[g]) g++;
    if (g - f >= minFrames) runs.push({ start: f * frame, end: g * frame });
    f = g;
  }
  return { speech: { start: first * frame, end: (last + 1) * frame }, runs };
}

export interface FrameResult {
  ok: boolean;
  reason?: string;
  left: { start: number; end: number };
  middle: { start: number; end: number };
  right: { start: number; end: number };
}

/**
 * Split a framed take into 3 parts: "Word. ev-ha-ri-sto. Word." or "ρα. ρα. ρα.".
 * Picks the two gaps that are long (sentence pauses) and leave left ≈ right in length,
 * with at least `minMiddleGaps` smaller gaps between them. Cuts are at gap midpoints.
 */
export function splitFrame(pcm: Float32Array, minMiddleGaps: number, o: SplitOptions): FrameResult {
  const { speech, runs } = analyze(pcm, o);
  const none = { start: 0, end: 0 };
  if (!speech) return { ok: false, reason: 'no speech found', left: none, middle: none, right: none };
  const sec = (n: number) => n / o.sampleRate;
  let best: { score: number; i: number; j: number } | null = null;
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1 + minMiddleGaps; j < runs.length; j++) {
      const left = sec(runs[i].start - speech.start);
      const right = sec(speech.end - runs[j].end);
      const score = sec(runs[i].end - runs[i].start) + sec(runs[j].end - runs[j].start) - Math.abs(left - right);
      if (!best || score > best.score) best = { score, i, j };
    }
  }
  if (!best) return { ok: false, reason: `found ${runs.length} gaps, need ${minMiddleGaps + 2}`, left: none, middle: none, right: none };
  const a = runs[best.i], b = runs[best.j];
  const midA = Math.round((a.start + a.end) / 2), midB = Math.round((b.start + b.end) / 2);
  return {
    ok: true,
    left: { start: 0, end: midA },
    middle: { start: midA, end: midB },
    right: { start: midB, end: pcm.length },
  };
}

/** Split into `syllables` parts. Fails if TTS did not leave enough clear gaps. */
export function split(pcm: Float32Array, syllables: number, o: SplitOptions): SplitResult {
  const { speech, runs } = analyze(pcm, o);
  if (!speech) return { ok: false, reason: 'no speech found', speech: { start: 0, end: pcm.length }, cuts: [], silences: [] };
  const need = syllables - 1;
  if (runs.length < need) {
    return { ok: false, reason: `found ${runs.length} gaps, need ${need}`, speech, cuts: [], silences: runs };
  }
  // Keep the longest N−1 gaps; extra short gaps (e.g. inside a stop consonant) are ignored.
  const used = [...runs].sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, need)
    .sort((a, b) => a.start - b.start);
  const cuts = used.map((s) => Math.round((s.start + s.end) / 2));

  // Each syllable's sound (excluding gaps) must be 60–600 ms.
  const bounds = [speech.start, ...used.flatMap((s) => [s.start, s.end]), speech.end];
  for (let k = 0; k < bounds.length; k += 2) {
    const ms = ((bounds[k + 1] - bounds[k]) / o.sampleRate) * 1000;
    if (ms < 60 || ms > 600) {
      return { ok: false, reason: `syllable ${k / 2 + 1} lasts ${Math.round(ms)} ms`, speech, cuts, silences: used };
    }
  }
  return { ok: true, speech, cuts, silences: used };
}

/** Short linear fades so cuts never click. */
export function fade(pcm: Float32Array, sampleRate: number, ms = 5): Float32Array {
  const out = pcm.slice();
  const n = Math.min(Math.round((ms / 1000) * sampleRate), Math.floor(out.length / 2));
  for (let i = 0; i < n; i++) {
    out[i] *= i / n;
    out[out.length - 1 - i] *= i / n;
  }
  return out;
}

/** Copy [start, end) and shrink every gap inside it to `keepMs` of silence. */
export function tighten(pcm: Float32Array, start: number, end: number, gaps: Silence[], sampleRate: number, keepMs = 40): Float32Array {
  const half = Math.round((keepMs / 2 / 1000) * sampleRate);
  const parts: Float32Array[] = [];
  let pos = start;
  for (const g of gaps) {
    if (g.start < start || g.end > end) continue;
    parts.push(pcm.subarray(pos, g.start + half));
    pos = g.end - half;
  }
  parts.push(pcm.subarray(pos, end));
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
