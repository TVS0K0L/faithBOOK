// The Bible: every book, then its chapters. Opens the reader with the AI verse toolbar.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page, Title } from '../../components/ui';
import { usePalette } from '../../theme';
import { getLang, t } from '../../lib/i18n';
import { BOOKS, TRANSLATIONS, bookName, type Book } from '../../lib/bible';

export default function BibleTab() {
  const c = usePalette();
  const lang = getLang();
  const [open, setOpen] = useState<Book | null>(null);
  const group = (title: string, list: Book[]) => (
    <View key={title} style={{ marginBottom: 18 }}>
      <Text style={{ color: c.mute, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginBottom: 8 }}>{title.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map(b => (
          <Pressable key={b.n} onPress={() => setOpen(open?.n === b.n ? null : b)} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: open?.n === b.n ? c.accent : c.card }}>
            <Text style={{ color: open?.n === b.n ? '#fff' : c.ink, fontWeight: '600' }}>{bookName(b, lang)}</Text>
          </Pressable>
        ))}
      </View>
      {open && list.some(b => b.n === open.n) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {Array.from({ length: open.chapters }, (_, i) => (
            <Pressable key={i} onPress={() => router.push(`/read/${open.n}/${i + 1}`)} style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft }}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>{i + 1}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
  return (
    <Page>
      <Title>{t('Bible')}</Title>
      <Text style={{ color: c.mute, marginTop: -6, marginBottom: 16 }}>{TRANSLATIONS[lang].name}</Text>
      {group(t('Old Testament'), BOOKS.slice(0, 39))}
      {group(t('New Testament'), BOOKS.slice(39))}
    </Page>
  );
}
