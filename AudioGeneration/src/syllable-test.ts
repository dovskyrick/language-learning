/**
 * Syllable TTS test (Plan 0 in company/audio/roadmap-syllables.md).
 * Voices each test word in several spellings so you can hear which trick
 * makes TTS speak clean syllables and word endings.
 *
 *   npm run syllable-test     → output/syllable-test/<word>/<variant>.mp3
 *
 * About 80 tiny requests, well under $0.05. Needs OPENAI_API_KEY only (no Firebase).
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { mkdirSync, writeFileSync } from 'fs';

// [whole word, ...syllables]
const WORDS: string[][] = [
  ['ευχαριστώ', 'ευ', 'χα', 'ρι', 'στώ'],
  ['παρακαλώ', 'πα', 'ρα', 'κα', 'λώ'],
  ['Θεσσαλονίκη', 'Θεσ', 'σα', 'λο', 'νί', 'κη'],
  ['καλημέρα', 'κα', 'λη', 'μέ', 'ρα'],
  ['εστιατόριο', 'ε', 'στι', 'α', 'τό', 'ρι', 'ο'],
  ['Δευτέρα', 'Δευ', 'τέ', 'ρα'],
];

const join = (s: string[], sep: string) => s.join(sep);
// What the lessons actually play: word endings growing back to the whole word.
const endings = (s: string[]) => s.map((_, i) => s.slice(s.length - 1 - i).join(''));

const SYLLABLE_VOICE =
  'Native Greek speaker, neutral Athenian accent. Say each syllable separately and clearly, ' +
  'with a short pause between syllables. Keep the stress on the accented syllable.';

type Test = { name: string; model: string; input: (s: string[]) => string; speed?: number; instructions?: string };
const TESTS: Test[] = [
  { name: '01-whole', model: 'tts-1', input: (s) => join(s, '') },
  { name: '02-hyphen', model: 'tts-1', input: (s) => join(s, '-') }, // ευ-χα-ρι-στώ
  { name: '03-hyphen-slow', model: 'tts-1', input: (s) => join(s, '-'), speed: 0.8 },
  { name: '04-spaced-hyphen', model: 'tts-1', input: (s) => join(s, ' - ') },
  { name: '05-dots', model: 'tts-1', input: (s) => join(s, '... ') },
  { name: '06-endings', model: 'tts-1', input: (s) => endings(s).join('... ') }, // στώ... ριστώ... χαριστώ...
  { name: '07-4o-whole', model: 'gpt-4o-mini-tts', input: (s) => join(s, '') },
  { name: '08-4o-instructed', model: 'gpt-4o-mini-tts', input: (s) => join(s, ''), instructions: SYLLABLE_VOICE },
  { name: '09-4o-hyphen-instructed', model: 'gpt-4o-mini-tts', input: (s) => join(s, '-'), instructions: SYLLABLE_VOICE },
  { name: '10-4o-endings', model: 'gpt-4o-mini-tts', input: (s) => endings(s).join('... '),
    instructions: 'Native Greek speaker. Read slowly, like a patient language teacher.' },
];

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env');
  const client = new OpenAI();
  const voice = (process.env.TTS_VOICE || 'alloy') as 'alloy';

  for (const [whole, ...syl] of WORDS) {
    const dir = `output/syllable-test/${whole}`;
    mkdirSync(dir, { recursive: true });
    for (const t of TESTS) {
      const input = t.input(syl);
      const res = await client.audio.speech.create({
        model: t.model,
        voice,
        input,
        speed: t.speed ?? 1,
        ...(t.instructions ? { instructions: t.instructions } : {}),
      } as any);
      writeFileSync(`${dir}/${t.name}.mp3`, Buffer.from(await res.arrayBuffer()));
      console.log(`${dir}/${t.name}.mp3   "${input}"`);
    }
  }
  console.log('\nScore each file in company/audio/syllable-test-log.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
