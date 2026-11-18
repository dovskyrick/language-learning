/**
 * Syllable library manifest. Written by `npm run syllables`, read by the
 * BackOffice app. Keep in sync with BackOffice/src/types.ts.
 */
export type ClipKind =
  | 'whole'      // normal TTS of the whole word
  | 'take'       // the hyphenated TTS take that was split
  | 'syllable'   // one syllable cut from the take
  | 'piece-a1'   // build-up piece from the take, gaps kept (slow, teacher-like)
  | 'piece-a2'   // same piece, gaps shrunk to 40 ms
  | 'piece-tts'; // piece voiced on its own (today's lessons, Plan 0)

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
  variant: string | null;     // hyphen variant that split cleanly, null if none did
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
  words: WordEntry[];
}
