import { StyleSheet } from 'react-native';

export const C = {
  bg: '#111418',
  card: '#1b2027',
  line: '#2a313b',
  text: '#e9edf2',
  dim: '#8f99a6',
  accent: '#5aa9ff',
  good: '#3fb950',
  ok: '#d29922',
  bad: '#f85149',
};

export const RATING_COLOR = { good: C.good, ok: C.ok, bad: C.bad } as const;

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  h1: { color: C.text, fontSize: 22, fontWeight: '700' },
  h2: { color: C.text, fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  text: { color: C.text, fontSize: 15 },
  dim: { color: C.dim, fontSize: 13 },
  card: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { backgroundColor: C.accent, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  btnText: { color: '#06121f', fontWeight: '700', fontSize: 15 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingVertical: 5, paddingHorizontal: 10, marginRight: 6, marginBottom: 6 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 8, borderWidth: 1, borderColor: C.line, padding: 12, fontSize: 16, marginBottom: 10 },
});
