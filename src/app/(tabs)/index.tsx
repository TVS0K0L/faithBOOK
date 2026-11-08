// Home: a greeting, the streak and level, the verse of the day, and the way into the Bible and the community.
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card, Page } from '../../components/ui';
import { usePalette } from '../../theme';
import { getLang, t } from '../../lib/i18n';
import { levelOf, loadProgress, type Progress } from '../../lib/progress';

const VERSES = [
  { en: ['John 3:16', 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.'], ru: ['Ин 3:16', 'Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного, дабы всякий верующий в Него, не погиб, но имел жизнь вечную.'], book: 43, ch: 3 },
  { en: ['Philippians 4:6', 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.'], ru: ['Флп 4:6', 'Не заботьтесь ни о чем, но всегда в молитве и прошении с благодарением открывайте свои желания пред Богом.'], book: 50, ch: 4 },
  { en: ['Joshua 1:9', 'Be strong and courageous. Don\'t be afraid. Don\'t be dismayed, for the LORD your God is with you wherever you go.'], ru: ['Нав 1:9', 'Будь тверд и мужествен, не страшись и не ужасайся; ибо с тобою Господь Бог твой везде, куда ни пойдешь.'], book: 6, ch: 1 },
];

function greeting() {
  const h = new Date().getHours();
  return t(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
}

export default function Home() {
  const c = usePalette();
  const [p, setP] = useState<Progress | null>(null);
  useFocusEffect(useCallback(() => { loadProgress().then(setP); }, []));
  const lang = getLang();
  const v = VERSES[new Date().getDate() % VERSES.length];
  const [ref, text] = v[lang];
  const L = levelOf(p?.xp ?? 0);
  return (
    <Page>
      <Text style={{ color: c.mute, fontSize: 12, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>FAITHBOOK</Text>
      <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800', marginBottom: 16 }}>{greeting()} 🤍</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 28, fontWeight: '800', color: c.flame }}>🔥 {p?.streak ?? 0}</Text><Text style={{ color: c.mute }}>{t('Your streak')}</Text></Card>
        <Card style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 28, fontWeight: '800', color: c.accent }}>{L.lv}</Text><Text style={{ color: c.mute }}>{t('Level')} · {L.into}/{L.need} XP</Text></Card>
      </View>
      <Pressable onPress={() => router.push(`/read/${v.book}/${v.ch}`)}>
        <Card>
          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>{t('Verse of the day').toUpperCase()} · {ref}</Text>
          <Text style={{ color: c.ink, fontSize: 18, lineHeight: 27 }}>{text}</Text>
        </Card>
      </Pressable>
      <Pressable onPress={() => router.push('/community')}>
        <Card style={{ backgroundColor: c.accent }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>🌍 {t('Community')}</Text>
          <Text style={{ color: '#fff', opacity: 0.9, marginTop: 4 }}>{t('Share what God is doing…')}</Text>
        </Card>
      </Pressable>
      <Card>
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>🏁 {t('Challenge of Krest')}</Text>
        <Text style={{ color: c.mute, marginTop: 4 }}>{t('Write the Cross by hand today and send a photo')}</Text>
      </Card>
    </Page>
  );
}
