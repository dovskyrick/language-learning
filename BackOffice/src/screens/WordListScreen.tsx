import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { reviewId } from '../firebase';
import { C, S } from '../theme';
import { Lib, LIBRARIES } from '../config';
import { ClipKind, kindLabel, Review, SyllableManifest, WordEntry } from '../types';

type Filter = 'all' | 'todo' | 'bad' | 'failed';
const FILTERS: [Filter, string][] = [['all', 'All'], ['todo', 'To rate'], ['bad', 'Has bad'], ['failed', 'Split failed']];
const COMPARE: ClipKind[] = ['whole', 'syllable', 'piece-a1', 'piece-a2', 'piece-tts'];

interface Props {
  lib: Lib;
  onSwitch: (lib: Lib) => void;
  manifest: SyllableManifest;
  reviews: Map<string, Review>;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (index: number) => void;
  onSignOut: () => void;
  email: string;
}

export default function WordListScreen({ lib, onSwitch, manifest, reviews, refreshing, onRefresh, onOpen, onSignOut, email }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const { language, module } = manifest;
  const rev = (w: WordEntry, key: string) => reviews.get(reviewId({ language, module, library: lib.library, wordId: w.id, clipKey: key }));
  const robot = manifest.engine === 'robot';

  // Which piece method sounds best so far: good / rated, per kind.
  const kinds = COMPARE.filter((k) => manifest.words.some((w) => w.clips.some((c) => c.kind === k)));
  const score = useMemo(() => kinds.map((kind) => {
    const label = kindLabel(kind, manifest.engine);
    let rated = 0, good = 0, bad = 0;
    for (const w of manifest.words) for (const c of w.clips) {
      if (c.kind !== kind) continue;
      const r = rev(w, c.key);
      if (!r) continue;
      rated++; if (r.rating === 'good') good++; if (r.rating === 'bad') bad++;
    }
    return { label, rated, good, bad };
  }), [manifest, reviews]);

  const totalClips = manifest.words.reduce((n, w) => n + w.clips.length, 0);
  const rows = manifest.words.map((w, index) => {
    const rated = w.clips.filter((c) => rev(w, c.key)).length;
    const bad = w.clips.filter((c) => rev(w, c.key)?.rating === 'bad').length;
    return { w, index, rated, bad };
  }).filter(({ w, rated, bad }) =>
    filter === 'all' || (filter === 'todo' && rated < w.clips.length) || (filter === 'bad' && bad > 0) || (filter === 'failed' && !w.auto.ok));

  return (
    <View style={S.screen}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.w.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.dim} />}
        ListHeaderComponent={
          <View>
            <View style={[S.row, { justifyContent: 'space-between' }]}>
              <Text style={S.h1}>{manifest.language} · {manifest.module}</Text>
              <TouchableOpacity onPress={onSignOut}><Text style={{ color: C.accent }}>Sign out</Text></TouchableOpacity>
            </View>
            <Text style={S.dim}>
              {manifest.words.length} words · {reviews.size}/{totalClips} clips rated · {manifest.model}/{manifest.voice} · {email}
            </Text>

            <View style={[S.row, { flexWrap: 'wrap', marginTop: 10 }]}>
              {LIBRARIES.map((l) => (
                <TouchableOpacity key={l.id} onPress={() => onSwitch(l)}
                  style={[S.chip, l.id === lib.id && { backgroundColor: C.text, borderColor: C.text }]}>
                  <Text style={{ color: l.id === lib.id ? C.bg : C.text }}>{l.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={S.h2}>{robot ? 'How good is the robot?' : 'Which piece style wins?'}</Text>
            <View style={S.card}>
              {score.map((s) => (
                <View key={s.label} style={[S.row, { justifyContent: 'space-between', paddingVertical: 3 }]}>
                  <Text style={S.text}>{s.label}</Text>
                  <Text style={S.dim}>
                    {s.rated ? `${Math.round((100 * s.good) / s.rated)}% good · ${s.bad} bad · ${s.rated} rated` : 'not rated yet'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[S.row, { flexWrap: 'wrap', marginTop: 8 }]}>
              {FILTERS.filter(([f]) => !(robot && f === 'failed')).map(([f, label]) => (
                <TouchableOpacity key={f} onPress={() => setFilter(f)}
                  style={[S.chip, filter === f && { backgroundColor: C.accent, borderColor: C.accent }]}>
                  <Text style={{ color: filter === f ? '#06121f' : C.text }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: { w, index, rated, bad } }) => (
          <TouchableOpacity style={S.card} onPress={() => onOpen(index)}>
            <View style={[S.row, { justifyContent: 'space-between' }]}>
              <Text style={[S.text, { fontSize: 18, fontWeight: '600' }]}>{w.word}</Text>
              {!robot && <Text style={{ color: w.auto.ok ? C.good : C.bad, fontSize: 12 }}>{w.auto.ok ? `split ✓ ${w.variant}` : 'split ✗'}</Text>}
            </View>
            <Text style={S.dim}>{w.syllables.join(' · ')}  —  {w.meaning}</Text>
            <Text style={[S.dim, { marginTop: 4 }]}>
              {rated}/{w.clips.length} rated{bad ? <Text style={{ color: C.bad }}>{`  ·  ${bad} bad`}</Text> : null}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[S.dim, { textAlign: 'center', marginTop: 30 }]}>Nothing here.</Text>}
      />
    </View>
  );
}
