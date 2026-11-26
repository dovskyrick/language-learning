/**
 * Syllable library manifest. Written by `npm run syllables`, read by the
 * BackOffice app. Keep in sync with BackOffice/src/types.ts.
 */
export type ClipKind =
  | 'whole'      // the whole word
  | 'syllable'   // one syllable
  | 'piece-tts'; // build-up piece (the end of the word), voiced on its own

export interface Clip {
  key: string;        // unique within the word, e.g. "p2-a1"
  kind: ClipKind;
  text: string;
  path: string;       // relative to the manifest folder
  ms: number;
}

export interface WordEntry {
  id: string;         // item id, e.g. "i006"
  word: string;
  meaning: string;
  syllables: string[];
  expectedSyllables?: number; // from items.json, when it disagrees with the syllabifier
  variant: string | null;     // robot voice settings, e.g. "espeak el speed 140"
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
  library?: string;   // 'robot' = eSpeak
  words: WordEntry[];
}
