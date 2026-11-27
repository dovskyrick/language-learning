/** Make every clip equally loud, so robot and OpenAI lines sit at the same volume. */
import { SAMPLE_RATE } from '../syllables/audio-io.js';

export const TARGET_DB = -20;   // speech RMS, dBFS
const PEAK = 0.9;               // never louder than this, so no clipping

export const silence = (sec: number) => new Float32Array(Math.round(sec * SAMPLE_RATE));

/** RMS of the speech only: 10 ms frames within 30 dB of the loudest one. Pauses inside a sentence don't count. */
export function speechDb(pcm: Float32Array): number {
  const frame = Math.round(0.01 * SAMPLE_RATE);
  const energy: number[] = [];
  for (let s = 0; s + frame <= pcm.length; s += frame) {
    let sum = 0;
    for (let i = s; i < s + frame; i++) sum += pcm[i] * pcm[i];
    energy.push(sum / frame);
  }
  if (!energy.length) return -Infinity;
  const loud = Math.max(...energy);
  if (loud <= 0) return -Infinity;
  const speech = energy.filter((e) => e >= loud * 1e-3); // 30 dB
  return 10 * Math.log10(speech.reduce((a, b) => a + b, 0) / speech.length);
}

export function levelTo(pcm: Float32Array, targetDb = TARGET_DB): Float32Array {
  const db = speechDb(pcm);
  if (!isFinite(db)) return pcm;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  const gain = Math.min(10 ** ((targetDb - db) / 20), peak > 0 ? PEAK / peak : 1);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] * gain;
  return out;
}
