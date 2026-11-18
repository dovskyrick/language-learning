import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MODULES } from './src/config';
import { currentEmail, fetchManifest, loadReviews, restore, reviewId, saveReview, signOut } from './src/firebase';
import { setupAudio } from './src/player';
import LoginScreen from './src/screens/LoginScreen';
import WordListScreen from './src/screens/WordListScreen';
import WordScreen from './src/screens/WordScreen';
import { C, S } from './src/theme';
import { Review, SyllableManifest } from './src/types';

type Screen = { name: 'boot' } | { name: 'login'; notice?: string } | { name: 'list' } | { name: 'word'; index: number };
const MOD = MODULES[0];

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'boot' });
  const [manifest, setManifest] = useState<SyllableManifest | null>(null);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [m, r] = await Promise.all([fetchManifest(MOD.language, MOD.module), loadReviews(MOD.language, MOD.module)]);
      setManifest(m); setReviews(r);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setupAudio().catch(() => {});
    restore().then((s) => {
      if (s?.admin) { setScreen({ name: 'list' }); load(); }
      else setScreen({ name: 'login', notice: s && !s.admin ? 'This account is not an admin yet.' : undefined });
    });
  }, [load]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'word') { setScreen({ name: 'list' }); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  function save(r: Review) {
    const id = reviewId(r);
    const before = reviews.get(id);
    setReviews((m) => new Map(m).set(id, r));
    saveReview(r).then(() => setSaveError('')).catch((e) => {
      setSaveError(e instanceof Error ? e.message : String(e));
      setReviews((m) => { const n = new Map(m); before ? n.set(id, before) : n.delete(id); return n; });
    });
  }

  async function logout() {
    await signOut();
    setManifest(null); setReviews(new Map());
    setScreen({ name: 'login' });
  }

  let body: React.ReactNode;
  if (screen.name === 'boot') body = <Centered><ActivityIndicator color={C.dim} /></Centered>;
  else if (screen.name === 'login') body = <LoginScreen notice={screen.notice} onSignedIn={() => { setScreen({ name: 'list' }); load(); }} />;
  else if (!manifest) {
    body = (
      <Centered>
        {loading ? <ActivityIndicator color={C.dim} /> : (
          <>
            <Text style={[S.text, { textAlign: 'center', marginBottom: 16 }]}>{error || 'Nothing loaded.'}</Text>
            <TouchableOpacity style={S.btn} onPress={load}><Text style={S.btnText}>Try again</Text></TouchableOpacity>
            <TouchableOpacity onPress={logout} style={{ marginTop: 16 }}><Text style={{ color: C.accent }}>Sign out</Text></TouchableOpacity>
          </>
        )}
      </Centered>
    );
  } else if (screen.name === 'list') {
    body = <WordListScreen title={MOD.title} manifest={manifest} reviews={reviews} refreshing={loading} onRefresh={load}
      onOpen={(index) => setScreen({ name: 'word', index })} onSignOut={logout} email={currentEmail()} />;
  } else {
    body = <WordScreen manifest={manifest} index={screen.index} reviews={reviews} onSave={save}
      onGo={(index) => setScreen({ name: 'word', index })} onBack={() => setScreen({ name: 'list' })} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={S.screen} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {body}
        {!!saveError && (
          <TouchableOpacity onPress={() => setSaveError('')} style={{ position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: C.bad, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: '#fff' }}>{saveError}  (tap to hide)</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[S.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>{children}</View>;
}
