/**
 * Greek syllabifier (school rules, hiatus kept: ή-λι-ος, ε-στι-α-τό-ρι-ο).
 * - Vowel digraphs and diphthongs are one nucleus: αι ει οι υι ου αυ ευ ηυ.
 *   A diaeresis (ϊ ϋ) or an accent on the first letter (άι) breaks them.
 * - Consonants between vowels: the longest ending of the cluster that can
 *   start a Greek word goes to the next syllable; double letters split.
 */

const VOWELS = new Set('αεηιουωάέήίόύώϊϋΐΰ');
const BASE: Record<string, string> = {
  ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω', ϊ: 'ι', ϋ: 'υ', ΐ: 'ι', ΰ: 'υ', ς: 'σ',
};
const ACCENTED = new Set('άέήίόύώΐΰ');
const DIAERESIS = new Set('ϊϋΐΰ');
const DIGRAPHS = new Set(['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ', 'ηυ']);

const ONSETS = new Set(
  ('βγ βδ βλ βρ γδ γκ γλ γν γρ δρ θλ θν θρ κλ κν κρ κτ μν μπ ντ πλ πν πρ πτ ' +
    'σβ σγ σθ σκ σλ σμ σν σπ στ σφ σχ τζ τμ τρ τσ φθ φλ φν φρ χθ χλ χν χρ ' +
    'γκρ μπρ μπλ ντρ σκλ σκρ σπλ σπρ στρ σφρ σχν σχρ').split(' '),
);

const base = (c: string) => BASE[c] ?? c;
const isVowel = (c: string) => VOWELS.has(c);

function canStart(cluster: string): boolean {
  const b = [...cluster].map(base).join('');
  return b.length <= 1 || ONSETS.has(b);
}

/** Split one word (lowercase or not) into syllables, keeping its original letters. */
export function syllabifyWord(word: string): string[] {
  const chars = [...word];
  const lower = chars.map((c) => c.toLowerCase());
  // Nuclei: [start, end) index ranges of vowel groups.
  const nuclei: [number, number][] = [];
  let i = 0;
  while (i < lower.length) {
    if (!isVowel(lower[i])) { i++; continue; }
    let end = i + 1;
    if (end < lower.length && isVowel(lower[end])) {
      const pair = base(lower[i]) + base(lower[end]);
      const joins = DIGRAPHS.has(pair) && !ACCENTED.has(lower[i]) && !DIAERESIS.has(lower[end]);
      if (joins) end++;
    }
    // Synizesis, as spoken: an unstressed ι / ει / οι / υ after a consonant and before
    // a vowel is a glide, so it joins the next vowel (για-τρός, ή-λιος, δε-ξιά, Κυ-ρια-κή).
    const nucleus = lower.slice(i, end).map(base).join('');
    const glide = ['ι', 'ει', 'οι', 'υ'].includes(nucleus) &&
      !lower.slice(i, end).some((c) => ACCENTED.has(c) || DIAERESIS.has(c));
    if (glide && i > 0 && !isVowel(lower[i - 1]) && end < lower.length && isVowel(lower[end])) {
      let next = end + 1;
      if (next < lower.length && isVowel(lower[next])) {
        const pair = base(lower[end]) + base(lower[next]);
        if (DIGRAPHS.has(pair) && !ACCENTED.has(lower[end]) && !DIAERESIS.has(lower[next])) next++;
      }
      end = next;
    }
    nuclei.push([i, end]);
    i = end;
  }
  if (nuclei.length <= 1) return [word];

  const cuts: number[] = [];
  for (let k = 0; k < nuclei.length - 1; k++) {
    const from = nuclei[k][1];
    const to = nuclei[k + 1][0];
    const cluster = lower.slice(from, to).join('');
    let cut = to; // no consonants: hiatus
    for (let s = from; s < to; s++) {
      if (canStart(cluster.slice(s - from))) { cut = s; break; }
    }
    cuts.push(cut);
  }
  const out: string[] = [];
  let prev = 0;
  for (const c of cuts) { out.push(chars.slice(prev, c).join('')); prev = c; }
  out.push(chars.slice(prev).join(''));
  return out;
}

/** Syllables of a phrase, punctuation removed, words kept in order. */
export function syllabify(text: string): string[] {
  return text
    .replace(/[.,;!?…·"«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(syllabifyWord);
}

/** Compare text ignoring case, accents and final sigma. */
export function plain(s: string): string {
  return [...s.toLowerCase()].map(base).join('').replace(/[^α-ω]/g, '');
}
