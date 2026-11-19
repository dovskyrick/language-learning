import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { clipSource, currentEmail, reviewId } from '../firebase';
import { play, playSequence, stop } from '../player';
import { C, RATING_COLOR, S } from '../theme';
import { Clip, ClipKind, KIND_LABEL, Rating, Review, SyllableManifest, TAGS, WordEntry } from '../types';

interface Props {
  manifest: SyllableManifest;
  index: number;
  reviews: Map<string, Review>;
  onSave: (r: Review) => void;
  onGo: (index: number) => void;
  onBack: () => void;
}

export default function WordScreen({ manifest, index, reviews, onSave, onGo, onBack }: Props) {
  const w = manifest.words[index];
  const { language, module } = manifest;
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => { stop(); }, [index]);

  const byKind = (k: ClipKind) => w.clips.filter((c) => c.kind === k);
  const pieceKeys = [...new Set(w.clips.filter((c) => c.kind.startsWith('piece')).map((c) => c.key.split('-').slice(0, -1).join('-')))];

  async function run(keys: string[], clips: Clip[]) {
    setError('');
    try {
      const sources = await Promise.all(clips.map((c) => clipSource(language, module, c.path)));
      await playSequence(sources, 700, (i) => setPlaying(i < 0 ? null : keys[i]));
    } catch (e) { setPlaying(null); setError(e instanceof Error ? e.message : String(e)); }
  }
  const playClip = (c: Clip) => run([c.key], [c]);

  /** Lesson-style build-up: pieces shortest first, then the whole word. */
  function buildUp(kind: ClipKind) {
    const clips = [...byKind(kind).sort((a, b) => a.text.length - b.text.length), ...w.clips.filter((c) => c.key === 'whole')];
    if (clips.length > 1) run(clips.map((c) => c.key), clips);
  }

  function rate(c: Clip, patch: Partial<Review>) {
    const prev = reviews.get(reviewId({ language, module, wordId: w.id, clipKey: c.key }));
    onSave({
      language, module, wordId: w.id, clipKey: c.key, kind: c.kind, text: c.text,
      rating: prev?.rating ?? 'good', tags: prev?.tags ?? [], note: prev?.note ?? '',
      ...patch, by: currentEmail(), updatedAt: new Date().toISOString(),
    });
  }

  const section = (title: string, clips: Clip[]) => clips.length ? (
    <View>
      <Text style={S.h2}>{title}</Text>
      {clips.map((c) => (
        <ClipRow key={c.key} clip={c} playing={playing === c.key} onPlay={() => playClip(c)} onRate={(p) => rate(c, p)}
          review={reviews.get(reviewId({ language, module, wordId: w.id, clipKey: c.key }))} />
      ))}
    </View>
  ) : null;

  return (
    <View style={S.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: C.accent, marginBottom: 10 }}>‹ All words</Text></TouchableOpacity>
        <Text style={[S.h1, { fontSize: 28 }]}>{w.word}</Text>
        <Text style={S.text}>{w.syllables.join(' · ')}   <Text style={S.dim}>{w.meaning}</Text></Text>
        <Text style={[S.dim, { marginTop: 4, color: w.auto.ok ? C.good : C.bad }]}>
          {w.auto.ok ? `Split cleanly with "${w.variant}"` : `Split failed: ${w.auto.reason}. Only Plan 0 pieces available.`}
          {w.expectedSyllables ? `  ·  items.json says ${w.expectedSyllables} syllables` : ''}
        </Text>
        {!!error && <Text style={{ color: C.bad, marginTop: 8 }}>{error}</Text>}

        <Text style={S.h2}>Hear the build-up like in a lesson</Text>
        <View style={[S.row, { flexWrap: 'wrap' }]}>
          {(['piece-a1', 'piece-a2', 'piece-tts'] as ClipKind[]).filter((k) => byKind(k).length).map((k) => (
            <TouchableOpacity key={k} style={[S.btn, { marginRight: 8, marginBottom: 8, paddingVertical: 10 }]} onPress={() => buildUp(k)}>
              <Text style={S.btnText}>▶ {KIND_LABEL[k]}</Text>
            </TouchableOpacity>
          ))}
          {playing && <TouchableOpacity style={[S.btn, { backgroundColor: C.line, marginBottom: 8 }]} onPress={() => { stop(); setPlaying(null); }}>
            <Text style={[S.btnText, { color: C.text }]}>■ Stop</Text></TouchableOpacity>}
        </View>

        {section('Whole word and hyphen take', [...byKind('whole'), ...byKind('take')])}
        {pieceKeys.map((pk) => section(`Piece: ${w.clips.find((c) => c.key.startsWith(pk + '-'))?.text}`,
          w.clips.filter((c) => c.kind.startsWith('piece') && c.key.startsWith(pk + '-'))))}
        {section('Syllables', byKind('syllable'))}
      </ScrollView>

      <View style={[S.row, { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.line }]}>
        <TouchableOpacity disabled={index === 0} onPress={() => onGo(index - 1)} style={[S.btn, { flex: 1, marginRight: 8, backgroundColor: C.line, opacity: index === 0 ? 0.4 : 1 }]}>
          <Text style={[S.btnText, { color: C.text }]}>‹ Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={index === manifest.words.length - 1} onPress={() => onGo(index + 1)} style={[S.btn, { flex: 1, opacity: index === manifest.words.length - 1 ? 0.4 : 1 }]}>
          <Text style={S.btnText}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ClipRow({ clip, review, playing, onPlay, onRate }: {
  clip: Clip; review?: Review; playing: boolean; onPlay: () => void; onRate: (p: Partial<Review>) => void;
}) {
  const [note, setNote] = useState(review?.note ?? '');
  useEffect(() => setNote(review?.note ?? ''), [review?.note]);
  const toggleTag = (t: string) => {
    const tags = review?.tags ?? [];
    onRate({ tags: tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t] });
  };

  return (
    <View style={[S.card, playing && { borderColor: C.accent }]}>
      <View style={S.row}>
        <TouchableOpacity onPress={onPlay} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: playing ? C.accent : C.line, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ color: playing ? '#06121f' : C.text, fontSize: 18 }}>▶</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[S.text, { fontSize: 17 }]}>{clip.text}</Text>
          <Text style={S.dim}>{KIND_LABEL[clip.kind]} · {clip.ms} ms</Text>
        </View>
        {(['good', 'ok', 'bad'] as Rating[]).map((r) => {
          const on = review?.rating === r;
          return (
            <TouchableOpacity key={r} onPress={() => onRate({ rating: r })}
              style={{ marginLeft: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: RATING_COLOR[r], backgroundColor: on ? RATING_COLOR[r] : 'transparent' }}>
              <Text style={{ color: on ? '#06121f' : RATING_COLOR[r], fontWeight: '700' }}>{r === 'good' ? '✓' : r === 'ok' ? '~' : '✗'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {review && review.rating !== 'good' && (
        <View style={{ marginTop: 10 }}>
          <View style={[S.row, { flexWrap: 'wrap' }]}>
            {TAGS.map((t) => {
              const on = review.tags.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => toggleTag(t)} style={[S.chip, on && { backgroundColor: C.text, borderColor: C.text }]}>
                  <Text style={{ color: on ? C.bg : C.dim, fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput style={[S.input, { marginBottom: 0, padding: 8, fontSize: 14 }]} placeholder="Note (optional)" placeholderTextColor={C.dim}
            value={note} onChangeText={setNote} onEndEditing={() => note !== review.note && onRate({ note })} />
        </View>
      )}
    </View>
  );
}
