# Roadmap: Hook Songs

Status: `LOOSE`. Starts after the syllable library has been rated. Details in [brainstorm-agent.md](brainstorm-agent.md).

| Phase | What | Effort | Gate to continue |
|---|---|---|---|
| **M0 · ear test** | Four 30-second sketches, one per genre: procedural beat plus TTS chops of ευχαριστώ, with the build-up riser, the gap and the drop. Plus one Lyria 3 / ACE-Step instrumental bed with the same chops, for comparison. | 1–2 days | You smile, and you can hear the word on the first listen. |
| **M1 · hook-machine MVP** | `HookSongs/` Python renderer: spec JSON → checked → 90 s mp3. Deep house only, V1 vocals, MC lines via TTS. 3 songs for Greek Module 1 (lessons 1–3, 4–6, 7–9). | 1 week | At least 2 of 3 songs rated "would replay". |
| **M2 · four genres + tuned vocals** | Afrobeats, liquid and jungle recipes; V2 pitch-quantized hooks; CC0 one-shots; a Songs tab in BackOffice for ratings. | 1–2 weeks | Each genre has 1 song that passes. |
| **M3 · AI beds** | Pluggable bed source: ACE-Step (rented GPU) or Lyria 3 API, plus beat-tracking, time-stretch and the same arranger. A/B against procedural. | 1 week | AI beds win on rating at under $0.10/song. Otherwise procedural stays. |
| **M4 · AI-sung research** | Greek lyrics sung by a model, Demucs stem split, ASR gate (CER ≤ 0.15), human rating. | 1 week, optional | Only if the gate passes on most songs. |
| **Ship** | A bonus track every 5 lessons in the player, plus a shareable 30-second clip for social media (growth). | — | — |

**Order logic:** pronunciation-safe first (P + V1), quality second (M2, M3), magic last (M4).

**Never:** copyrighted samples (including the Amen break), non-commercial weights (MusicGen) in shipped audio, or artist names in prompts.
