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
