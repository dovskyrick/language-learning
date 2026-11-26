# Bad single-word audio, in 40-word bites

**Rate limiting?** Probably not. When OpenAI limits you, it sends an error instead of worse audio. Our script would have crashed, and it didn't. So slow overnight requests wouldn't fix anything: same model, same short inputs.

**Real cause, most likely.** The OpenAI forums are full of reports that single words come back silent, clipped or garbled, especially in other languages. Our shortest inputs, like "ρα", are the worst. The model must also guess "Greek" from a few letters.

**Our own cutting.** The syllable splitter can pick wrong gaps, so some cut clips are our fault. Whole words are never cut, though. The phone player also sometimes clips the start. The audit will separate these causes.

**Fix 1: never send one word.** Send "Ευχαριστώ. Ευχαριστώ. Ευχαριστώ.", split on the silences (code we already have), and keep the best copy. Later: put the word in a sentence and cut it out precisely.

**Fix 2: several takes, checked instantly.** After every request, check: not silent, sensible length? If not, retry with another phrasing, up to 5 times. Also retry properly on API errors. The audit later picks the best take.

**Fix 3: other voices.** Tell gpt-4o-mini-tts "native Greek speaker". Or test Microsoft Azure or Google Greek voices, which are built for short words, and the whole module fits their free tier. One A/B listen decides.

**Your overnight idea.** The batch is good, the waiting isn't needed. Best-of-N for 85 words takes minutes and costs cents. I'd build it tomorrow together with the audit, so the machine picks the takes and you review only doubtful ones.
