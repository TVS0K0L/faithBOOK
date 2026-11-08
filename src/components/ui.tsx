// Small shared pieces: a page, a card, a chip, a button. Everything takes its colours from the palette.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, usePalette } from '../theme';

export function Page({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const c = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {scroll ? <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>{children}</ScrollView> : <View style={{ flex: 1 }}>{children}</View>}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = usePalette();
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return <Text style={[s.title, { color: c.ink }]}>{children}</Text>;
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} style={[s.chip, { backgroundColor: on ? c.accent : c.card, borderColor: on ? c.accent : c.line }]}>
      <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, ghost, disabled }: { label: string; onPress: () => void; ghost?: boolean; disabled?: boolean }) {
  const c = usePalette();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.btn, { backgroundColor: ghost ? c.accentSoft : c.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      <Text style={{ color: ghost ? c.accent : '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 12, letterSpacing: 0.3 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.chip, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  btn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 10 },
});
