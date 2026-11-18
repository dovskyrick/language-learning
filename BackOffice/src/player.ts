/** Small expo-av wrapper (same engine as the lesson player): one clip at a time, or a sequence. */
import { Audio } from 'expo-av';

type Source = { uri: string; headers: Record<string, string> };

let current: Audio.Sound | null = null;
let runId = 0;

export async function setupAudio() {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: false, staysActiveInBackground: false });
}

export async function stop() {
  runId++;
  const s = current;
  current = null;
  if (s) { try { await s.stopAsync(); await s.unloadAsync(); } catch { /* already unloaded */ } }
}

function playOne(src: Source, id: number): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: true }, (st) => {
        if (!st.isLoaded) { if (st.error) reject(new Error(st.error)); return; }
        if (st.didJustFinish) { sound.unloadAsync().catch(() => {}); if (current === sound) current = null; resolve(); }
      });
      if (id !== runId) { await sound.unloadAsync(); resolve(); return; }
      current = sound;
    } catch (e) { reject(e); }
  });
}

/** Play clips in order with `gapMs` of silence between them, like a lesson build-up. */
export async function playSequence(sources: Source[], gapMs = 600, onStep?: (i: number) => void) {
  await stop();
  const id = runId;
  for (let i = 0; i < sources.length; i++) {
    if (id !== runId) return;
    onStep?.(i);
    await playOne(sources[i], id);
    if (i < sources.length - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  if (id === runId) onStep?.(-1);
}

export const play = (src: Source, onStep?: (i: number) => void) => playSequence([src], 0, onStep);
