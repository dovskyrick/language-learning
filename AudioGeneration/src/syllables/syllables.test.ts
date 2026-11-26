import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syllabify } from './syllabify.js';

test('Greek syllables follow speech', () => {
  const cases: Record<string, string> = {
    ευχαριστώ: 'ευ-χα-ρι-στώ', παρακαλώ: 'πα-ρα-κα-λώ', Θεσσαλονίκη: 'Θεσ-σα-λο-νί-κη',
    γιατρός: 'για-τρός', ήλιος: 'ή-λιος', Μαρία: 'Μα-ρί-α', Κυριακή: 'Κυ-ρια-κή',
    εστιατόριο: 'ε-στια-τό-ριο', ξενοδοχείο: 'ξε-νο-δο-χεί-ο', αριθμός: 'α-ριθ-μός',
    Δευτέρα: 'Δευ-τέ-ρα', πρωινό: 'πρω-ι-νό', καταλαβαίνω: 'κα-τα-λα-βαί-νω',
  };
  for (const [w, s] of Object.entries(cases)) assert.equal(syllabify(w).join('-'), s, w);
  assert.deepEqual(syllabify('Τι ώρα είναι;'), ['Τι', 'ώ', 'ρα', 'εί', 'ναι']);
});
