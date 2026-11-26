/** Decode and encode audio with the bundled ffmpeg (mono, 24 kHz float PCM). */
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export const SAMPLE_RATE = 24000;

function ffmpeg(args: string[], input?: Buffer): Buffer {
  const r = spawnSync(ffmpegPath as unknown as string, ['-hide_banner', '-loglevel', 'error', ...args], {
    input,
    maxBuffer: 1 << 28,
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr?.toString()}`);
  return r.stdout;
}

export function decode(file: string): Float32Array {
  const raw = ffmpeg(['-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-']);
  const out = new Float32Array(raw.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = raw.readInt16LE(i * 2) / 32768;
  return out;
}

export function encodeMp3(pcm: Float32Array, file: string): void {
  const raw = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i++) {
    raw.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767))), i * 2);
  }
  ffmpeg(['-y', '-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '64k', file], raw);
}

/** Cut the silence before and after the speech, keeping `padMs`, with short fades so it never clicks. */
export function trim(pcm: Float32Array, padMs = 50, thresholdDb = 30, fadeMs = 5): Float32Array {
  const frame = Math.round(0.01 * SAMPLE_RATE);
  const db: number[] = [];
  for (let s = 0; s + frame <= pcm.length; s += frame) {
    let sum = 0;
    for (let i = s; i < s + frame; i++) sum += pcm[i] * pcm[i];
    db.push(20 * Math.log10(Math.sqrt(sum / frame) + 1e-9));
  }
  const thr = Math.max(...db) - thresholdDb;
  const first = db.findIndex((d) => d >= thr);
  if (first < 0) return pcm;
  const last = db.length - 1 - [...db].reverse().findIndex((d) => d >= thr);
  const pad = Math.round((padMs / 1000) * SAMPLE_RATE);
  const out = pcm.slice(Math.max(0, first * frame - pad), Math.min(pcm.length, (last + 1) * frame + pad));
  const n = Math.min(Math.round((fadeMs / 1000) * SAMPLE_RATE), Math.floor(out.length / 2));
  for (let i = 0; i < n; i++) { out[i] *= i / n; out[out.length - 1 - i] *= i / n; }
  return out;
}
