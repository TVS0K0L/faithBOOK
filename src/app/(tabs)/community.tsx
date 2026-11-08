// The church's wall: testimonies, prayer requests and posts, in the order the server ranks them.
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Card, Chip } from '../../components/ui';
import { usePalette } from '../../theme';
import { t } from '../../lib/i18n';
import { ago, loadFeed, prayFor, react, type Post, type PostKind } from '../../lib/feed';
import { earn } from '../../lib/progress';
import { isPreview } from '../../lib/supabase';

const FILTERS: [PostKind | undefined, string][] = [[undefined, 'Feed'], ['testimony', 'Testimonies'], ['prayer', 'Prayer']];
const KIND_ICON: Record<PostKind, string> = { post: '📝', testimony: '🙌', prayer: '🙏', event: '📅', poll: '📊', announcement: '📣' };

export default function Community() {
  const c = usePalette();
  const [kind, setKind] = useState<PostKind | undefined>(undefined);
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => { setLoading(true); loadFeed(kind).then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, [kind]);
  useFocusEffect(load);

  const card = ({ item: p }: { item: Post }) => (
    <Card>
      <Text style={{ color: c.ink, fontWeight: '700' }}>{KIND_ICON[p.kind]} {p.anonymous ? '🕶' : ''} {p.author_name} <Text style={{ color: c.mute, fontWeight: '400' }}>· {ago(p.created_at)}</Text></Text>
      <Text style={{ color: c.ink, fontSize: 15.5, lineHeight: 23, marginTop: 8 }}>{p.body}</Text>
      {p.verse_ref && <View style={{ borderLeftWidth: 3, borderLeftColor: c.gold, paddingLeft: 10, marginTop: 10 }}>
        {p.verse_text && <Text style={{ color: c.ink, fontStyle: 'italic' }}>«{p.verse_text}»</Text>}
        <Text style={{ color: c.gold, fontWeight: '700', marginTop: 4 }}>{p.verse_ref}</Text>
      </View>}
      {p.media_url && <Image source={{ uri: p.media_url }} style={{ width: '100%', height: 220, borderRadius: 14, marginTop: 10 }} resizeMode="cover" />}
      {p.kind === 'prayer' && (
        <Pressable onPress={() => !p.i_prayed && prayFor(p).then(() => { earn(5); load(); })} style={{ marginTop: 12, padding: 11, borderRadius: 14, alignItems: 'center', backgroundColor: p.i_prayed ? c.accent : c.accentSoft }}>
          <Text style={{ color: p.i_prayed ? '#fff' : c.accent, fontWeight: '800' }}>🙏 {t('I prayed')} · {p.prayed}</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
        {['❤️', '🙏', '🙌', '✝️'].map(e => (
          <Pressable key={e} onPress={() => react(p, e).then(load)}><Text style={{ fontSize: 20, opacity: p.my_reaction === e ? 1 : 0.55 }}>{e}</Text></Pressable>
        ))}
        <Text style={{ color: c.mute, marginLeft: 'auto', alignSelf: 'center' }}>{p.reactions} · 💬 {p.comments}</Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={p => p.id}
        renderItem={card}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <View>
            <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800', marginBottom: 12 }}>{t('Community')}</Text>
            {isPreview && <Text style={{ color: c.mute, marginBottom: 10 }}>{t('Preview mode: connect Supabase to save for real.')}</Text>}
            <Pressable onPress={() => router.push('/compose')} style={{ backgroundColor: c.card, borderRadius: 999, padding: 14, marginBottom: 12 }}>
              <Text style={{ color: c.mute }}>✍️ {t('Share what God is doing…')}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {FILTERS.map(([k, label]) => <Chip key={label} label={t(label)} on={kind === k} onPress={() => setKind(k)} />)}
            </View>
          </View>
        }
        ListEmptyComponent={!loading ? <Text style={{ color: c.mute, textAlign: 'center', marginTop: 30 }}>{t('Nothing here yet. Be the first!')}</Text> : undefined}
      />
    </SafeAreaView>
  );
}
