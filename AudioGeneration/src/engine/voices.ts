/**
 * Who voices each lesson line.
 *  - `say` (English instructor)         → OpenAI, narrator voice
 *  - `target` with 2+ words             → OpenAI, target voice
 *  - `target` with 1 word               → robot (MBROLA)
 *  - `target` that is a build-up piece  → robot (MBROLA)
 *  - `voice` on the line overrides all of this.
 * Short inputs are exactly where neural TTS fails, and the robot never does.
 */
import { Item, Line } from '../curriculum/types.js';
import { plain } from '../syllables/syllabify.js';

export type Engine = 'openai' | 'robot';
export type Role = 'narrator' | 'target';

export interface Voicing {
  engine: Engine;
  role: Role;
  text: string;      // what is sent to the engine
  reason: string;    // for the dry-run report
}

const words = (t: string) => t.replace(/[.,;:!?…«»"“”()-]+/g, ' ').trim().split(/\s+/).filter(Boolean);

/** A build-up piece: one item, and the line is a proper ending of that item's word. */
export function isBuildUpPiece(line: Line, items: Map<string, Item>): boolean {
  if (!line.target || line.items?.length !== 1) return false;
  const item = items.get(line.items[0]);
  if (!item) return false;
  const p = plain(line.target), w = plain(item.target);
  return !!p && p !== w && w.endsWith(p);
}

export function voiceFor(line: Line, items: Map<string, Item>): Voicing | null {
  if (line.say?.trim()) {
    return { engine: line.voice ?? 'openai', role: 'narrator', text: line.say.trim(), reason: 'instructor' };
  }
  const t = line.target?.trim();
  if (!t) return null;
  const piece = isBuildUpPiece(line, items);
  const single = words(t).length === 1;
  const auto: Engine = piece || single ? 'robot' : 'openai';
  const engine = line.voice ?? auto;
  // The robot reads punctuation as intonation poorly; send it the bare word or phrase.
  const text = engine === 'robot' ? t.replace(/[.,;!?…]+$/g, '').trim() : t;
  const reason = line.voice ? 'override' : piece ? 'build-up piece' : single ? 'single word' : 'phrase';
  return { engine, role: 'target', text, reason };
}
