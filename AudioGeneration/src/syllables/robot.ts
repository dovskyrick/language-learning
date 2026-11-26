/**
 * Robot voice: eSpeak NG (rule-based, offline, free). Says any word or syllable
 * the same way every time, so no cutting is needed.
 * Install once: sudo apt install espeak-ng   (second robot: sudo apt install mbrola mbrola-gr2)
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { decode } from './audio-io.js';

// A lone vowel letter is read as its name ("ο" → "omikron"); send the sound instead.
const VOWEL: Record<string, string> = {
  α: 'a', ά: "'a", ε: 'e', έ: "'e", η: 'i', ή: "'i", ι: 'i', ί: "'i", ϊ: 'i', ΐ: "'i",
  ο: 'o', ό: "'o", υ: 'i', ύ: "'i", ϋ: 'i', ΰ: "'i", ω: 'o', ώ: "'o",
};

export function robotInput(text: string): string {
  const t = text.trim().toLowerCase();
  return VOWEL[t] ? `[[${VOWEL[t]}]]` : text.trim();
}

export function checkEspeak(voice: string): void {
  const r = spawnSync('espeak-ng', ['--voices=el']);
  if (r.error || r.status !== 0) throw new Error('espeak-ng not found. Install it: sudo apt install espeak-ng');
  if (!r.stdout.toString().includes(voice === 'el' ? 'grk/el' : voice.replace('mb-', 'mb/mb-'))) {
    throw new Error(`eSpeak voice "${voice}" not installed. For MBROLA voices: sudo apt install mbrola mbrola-${voice.replace('mb-', '')}`);
  }
}

export interface RobotVoice { voice: string; speed: number; pitch: number }

/** Speak text with eSpeak NG and return mono 24 kHz PCM. */
export function robotSay(text: string, v: RobotVoice): Float32Array {
  const dir = mkdtempSync(join(tmpdir(), 'robot-'));
  try {
    const wav = join(dir, 'out.wav');
    const r = spawnSync('espeak-ng', ['-v', v.voice, '-s', String(v.speed), '-p', String(v.pitch), '-w', wav, robotInput(text)]);
    if (r.status !== 0) throw new Error(`espeak-ng failed for "${text}": ${r.stderr?.toString()}`);
    return decode(wav);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
