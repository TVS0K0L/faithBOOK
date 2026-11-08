// Profile: your level and streak, language, and signing in or out.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Chip, Page, Title } from '../../components/ui';
import { usePalette } from '../../theme';
import { getLang, setLang, t } from '../../lib/i18n';
import { levelOf, loadProgress, type Progress } from '../../lib/progress';
import { isPreview, supabase } from '../../lib/supabase';

export default function Profile() {
  const c = usePalette();
  const [p, setP] = useState<Progress | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [lang, setL] = useState(getLang());
  useFocusEffect(useCallback(() => { loadProgress().then(setP); }, []));
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  const L = levelOf(p?.xp ?? 0);
  return (
    <Page>
      <Title>{t('Profile')}</Title>
      <Card>
        <Text style={{ color: c.ink, fontSize: 20, fontWeight: '800' }}>{email ?? (isPreview ? 'Preview' : '—')}</Text>
        <Text style={{ color: c.mute, marginTop: 6 }}>{t('Level')} {L.lv} · {p?.xp ?? 0} XP · 🔥 {p?.streak ?? 0} {t('days')}</Text>
        <View style={{ height: 8, backgroundColor: c.bg2, borderRadius: 8, marginTop: 12, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round((100 * L.into) / L.need)}%`, height: 8, backgroundColor: c.accent }} />
        </View>
      </Card>
      <Text style={{ color: c.mute, fontWeight: '700', marginBottom: 8 }}>{t('Language')}</Text>
      <View style={{ flexDirection: 'row' }}>
        <Chip label="English" on={lang === 'en'} onPress={() => { setLang('en'); setL('en'); }} />
        <Chip label="Русский" on={lang === 'ru'} onPress={() => { setLang('ru'); setL('ru'); }} />
      </View>
      {supabase && (email
        ? <Button ghost label={t('Sign out')} onPress={() => supabase?.auth.signOut()} />
        : <Button label={t('Sign in')} onPress={() => router.push('/sign-in')} />)}
    </Page>
  );
}
