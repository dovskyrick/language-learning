/** Mirror of AudioGeneration/src/syllables/manifest.ts. Keep in sync. */
export type ClipKind = 'whole' | 'take' | 'syllable' | 'piece-a1' | 'piece-a2' | 'piece-tts';

export interface Clip {
  key: string;
  kind: ClipKind;
  text: string;
  path: string;
  ms: number;
}

export interface WordEntry {
  id: string;
  word: string;
  meaning: string;
  syllables: string[];
  expectedSyllables?: number;
  variant: string | null;
  auto: { ok: boolean; reason?: string };
  clips: Clip[];
}

export interface SyllableManifest {
  version: 1;
  language: string;
  module: string;
  generatedAt: string;
  model: string;
  voice: string;
  engine?: 'openai' | 'robot';
  library?: string;
  words: WordEntry[];
}

export type Rating = 'good' | 'ok' | 'bad';

export interface Review {
  language: string;
  module: string;
  library?: string; // missing on old reviews = '' (OpenAI library)
  wordId: string;
  clipKey: string;
  kind: ClipKind;
  text: string;
  rating: Rating;
  tags: string[];
  note: string;
  by: string;
  updatedAt: string;
}

export const TAGS = ['wrong sound', 'wrong stress', 'cut early', 'cut late', 'choppy', 'noise', 'robotic', 'spelled out'];

export const kindLabel = (kind: ClipKind, engine?: string) =>
  engine === 'robot' && kind === 'piece-tts' ? 'Robot piece' : KIND_LABEL[kind];

export const KIND_LABEL: Record<ClipKind, string> = {
  whole: 'Whole word',
  take: 'Hyphen take',
  syllable: 'Syllable',
  'piece-a1': 'A1 · gaps kept',
  'piece-a2': 'A2 · gaps tight',
  'piece-tts': 'Plan 0 · TTS alone',
};
