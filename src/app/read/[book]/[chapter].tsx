// The reader: tap verses to select them, then one tap on the toolbar asks the AI about them;
// the bar under the page keeps a question about the chapter open.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePalette } from '../../../theme';
import { getLang, t } from '../../../lib/i18n';
import { BOOKS, bookName, readChapter, refLabel, type Verse } from '../../../lib/bible';
import { ACTIONS, askVerse, type VerseAction } from '../../../lib/ai';
import { earn } from '../../../lib/progress';

export default function Reader() {
  const c = usePalette();
  const lang = getLang();
  const params = useLocalSearchParams<{ book: string; chapter: string }>();
  const book = BOOKS.find(b => b.n === Number(params.book)) ?? BOOKS[0];
  const ch = Math.max(1, Math.min(book.chapters, Number(params.chapter) || 1));
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ title: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setFailed(false); readChapter(lang, book.n, ch).then(v => { setVerses(v); earn(5); }).catch(() => setFailed(true)); };
  useEffect(load, [book.n, ch]);

  const picked = useMemo(() => (verses ?? []).filter(v => sel.includes(v.v)), [verses, sel]);
  const ref = picked.length ? refLabel(book, lang, ch, picked[0].v, picked[picked.length - 1].v) : `${bookName(book, lang)} ${ch}`;

  const run = async (action: VerseAction, label: string) => {
    const text = picked.length ? picked.map(v => v.text).join(' ') : (verses ?? []).map(v => `${v.v} ${v.text}`).join(' ');
    setBusy(true);
    setAnswer({ title: `${label} · ${ref}`, text: '' });
    try {
      const a = await askVerse({ action, ref, text, lang, question: action === 'ask' ? question : undefined });
      setAnswer({ title: `${label} · ${ref}`, text: a });
      earn(10);
    } catch {
      setAnswer({ title: `${label} · ${ref}`, text: t('Try again') });
    } finally { setBusy(false); }
  };

  const toggle = (v: number) => setSel(s => (s.includes(v) ? s.filter(x => x !== v) : [...s, v].sort((a, b) => a - b)));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: `${bookName(book, lang)} ${ch}` }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 160 }}>
        {!verses && !failed && <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />}
        {failed && <Pressable onPress={load}><Text style={{ color: c.bad, textAlign: 'center', marginTop: 40 }}>{t('Try again')}</Text></Pressable>}
        <Text style={{ color: c.ink, fontSize: 19, lineHeight: 31 }}>
          {(verses ?? []).map(v => (
            <Text key={v.v} onPress={() => toggle(v.v)} style={sel.includes(v.v) ? { backgroundColor: c.accentSoft, color: c.accent } : undefined}>
              <Text style={{ color: c.mute, fontSize: 12 }}>{v.v} </Text>{v.text}{' '}
            </Text>
          ))}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
          {ch > 1 ? <Pressable onPress={() => router.replace(`/read/${book.n}/${ch - 1}`)}><Text style={{ color: c.accent, fontWeight: '700' }}>‹ {ch - 1}</Text></Pressable> : <View />}
          {ch < book.chapters ? <Pressable onPress={() => router.replace(`/read/${book.n}/${ch + 1}`)}><Text style={{ color: c.accent, fontWeight: '700' }}>{ch + 1} ›</Text></Pressable> : <View />}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: 24 }}>
        {picked.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 8 }}>
            <Text style={{ color: c.accent, fontWeight: '700', alignSelf: 'center', marginRight: 4 }}>{ref}</Text>
            {ACTIONS.map(a => (
              <Pressable key={a.key} onPress={() => run(a.key, t(a.label))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.accentSoft }}>
                <Text style={{ color: c.accent, fontWeight: '700' }}>{a.icon} {t(a.label)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: picked.length ? 0 : 10 }}>
          <TextInput value={question} onChangeText={setQuestion} placeholder={t('Ask anything about this chapter…')} placeholderTextColor={c.mute}
            style={{ flex: 1, backgroundColor: c.bg, color: c.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }} onSubmitEditing={() => question.trim() && run('ask', t('Ask'))} returnKeyType="send" />
          <Pressable disabled={!question.trim()} onPress={() => run('ask', t('Ask'))} style={{ backgroundColor: c.accent, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', opacity: question.trim() ? 1 : 0.5 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('Ask')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!answer} animationType="slide" transparent onRequestClose={() => setAnswer(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,60,0.3)' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '80%' }}>
            <Text style={{ color: c.accent, fontWeight: '800', marginBottom: 10 }}>{answer?.title}</Text>
            <ScrollView>
              {busy ? <Text style={{ color: c.mute }}>{t('Thinking…')}</Text> : <Text style={{ color: c.ink, fontSize: 16, lineHeight: 25 }}>{answer?.text}</Text>}
              <Text style={{ color: c.mute, fontSize: 12, marginTop: 14 }}>{t('This is a study aid, not a pastor. Check it with Scripture and your church.')}</Text>
            </ScrollView>
            <Pressable onPress={() => setAnswer(null)} style={{ marginTop: 14, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: c.accentSoft }}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>{t('Close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
