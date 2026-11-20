import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lib, LIBRARIES } from './src/config';
import { currentEmail, fetchManifest, loadReviews, restore, reviewId, saveReview, signOut } from './src/firebase';
import { setupAudio } from './src/player';
import LoginScreen from './src/screens/LoginScreen';
import WordListScreen from './src/screens/WordListScreen';
import WordScreen from './src/screens/WordScreen';
import { C, S } from './src/theme';
import { Review, SyllableManifest } from './src/types';

type Screen = { name: 'boot' } | { name: 'login'; notice?: string } | { name: 'list' } | { name: 'word'; index: number };
const LIB_KEY = 'library-v1';

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'boot' });
  const [lib, setLib] = useState<Lib>(LIBRARIES[0]);
  const [manifest, setManifest] = useState<SyllableManifest | null>(null);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async (l: Lib = lib) => {
    setLoading(true); setError('');
    try {
      const [m, r] = await Promise.all([fetchManifest(l), loadReviews(l)]);
      setManifest(m); setReviews(r);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [lib]);

  useEffect(() => {
    setupAudio().catch(() => {});
    Promise.all([restore(), AsyncStorage.getItem(LIB_KEY).catch(() => null)]).then(([s, saved]) => {
      const l = LIBRARIES.find((x) => x.id === saved) ?? LIBRARIES[0];
      setLib(l);
      if (s?.admin) { setScreen({ name: 'list' }); load(l); }
      else setScreen({ name: 'login', notice: s && !s.admin ? 'This account is not an admin yet.' : undefined });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  function switchLib(l: Lib) {
    if (l.id === lib.id) return;
    setLib(l); setManifest(null); setReviews(new Map());
    AsyncStorage.setItem(LIB_KEY, l.id).catch(() => {});
    setScreen({ name: 'list' }); load(l);
  }

  async function logout() {
    await signOut();
    setManifest(null); setReviews(new Map());
    setScreen({ name: 'login' });
  }

  let body: React.ReactNode;
  if (screen.name === 'boot') body = <Centered><ActivityIndicator color={C.dim} /></Centered>;
  else if (screen.name === 'login') body = <LoginScreen notice={screen.notice} onSignedIn={() => { setScreen({ name: 'list' }); load(lib); }} />;
  else if (!manifest) {
    body = (
      <Centered>
        {loading ? <ActivityIndicator color={C.dim} /> : (
          <>
            <Text style={[S.dim, { marginBottom: 6 }]}>{lib.title} library</Text>
            <Text style={[S.text, { textAlign: 'center', marginBottom: 16 }]}>{error || 'Nothing loaded.'}</Text>
            <TouchableOpacity style={S.btn} onPress={() => load(lib)}><Text style={S.btnText}>Try again</Text></TouchableOpacity>
            {LIBRARIES.filter((l) => l.id !== lib.id).map((l) => (
              <TouchableOpacity key={l.id} onPress={() => switchLib(l)} style={{ marginTop: 16 }}>
                <Text style={{ color: C.accent }}>Open {l.title} instead</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={logout} style={{ marginTop: 16 }}><Text style={{ color: C.accent }}>Sign out</Text></TouchableOpacity>
          </>
        )}
      </Centered>
    );
  } else if (screen.name === 'list') {
    body = <WordListScreen lib={lib} onSwitch={switchLib} manifest={manifest} reviews={reviews} refreshing={loading} onRefresh={() => load(lib)}
      onOpen={(index) => setScreen({ name: 'word', index })} onSignOut={logout} email={currentEmail()} />;
  } else {
    body = <WordScreen lib={lib} manifest={manifest} index={screen.index} reviews={reviews} onSave={save}
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
