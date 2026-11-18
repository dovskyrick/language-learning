import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signIn } from '../firebase';
import { C, S } from '../theme';

export default function LoginScreen({ onSignedIn, notice }: { onSignedIn: () => void; notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice ?? '');

  async function submit() {
    setBusy(true); setError('');
    try {
      const s = await signIn(email.trim(), password);
      if (!s.admin) setError('Signed in, but this account is not an admin yet. Run: npm run set-admin -- ' + s.email);
      else onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <View style={[S.screen, { padding: 24, justifyContent: 'center' }]}>
      <Text style={[S.h1, { marginBottom: 4 }]}>Jim BackOffice</Text>
      <Text style={[S.dim, { marginBottom: 24 }]}>Syllable library review. Admins only.</Text>
      <TextInput style={S.input} placeholder="Email" placeholderTextColor={C.dim} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      <TextInput style={S.input} placeholder="Password" placeholderTextColor={C.dim} secureTextEntry
        autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      <TouchableOpacity style={[S.btn, { opacity: busy || !email || !password ? 0.5 : 1 }]} disabled={busy || !email || !password} onPress={submit}>
        {busy ? <ActivityIndicator color="#06121f" /> : <Text style={S.btnText}>Sign in</Text>}
      </TouchableOpacity>
      {!!error && <Text style={{ color: C.bad, marginTop: 16 }}>{error}</Text>}
    </View>
  );
}
