// Writing for the wall: a post, a testimony with a verse, or a prayer request (anonymous if you like).
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Chip, Page } from '../components/ui';
import { usePalette } from '../theme';
import { t } from '../lib/i18n';
import { createPost, type Post, type PostKind } from '../lib/feed';
import { earn } from '../lib/progress';

export default function Compose() {
  const c = usePalette();
  const [kind, setKind] = useState<PostKind>('post');
  const [body, setBody] = useState('');
  const [verse, setVerse] = useState('');
  const [anon, setAnon] = useState(false);
  const [audience, setAudience] = useState<Post['audience']>('all');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  };
  const publish = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      // Photos are uploaded to Storage and checked by moderation before they are public (next step on the roadmap).
      await createPost({ kind, body: body.trim(), verse_ref: verse.trim(), audience, anonymous: anon, media_url: photo });
      await earn(kind === 'testimony' ? 25 : 5);
      router.back();
    } finally { setBusy(false); }
  };

  const field = { backgroundColor: c.card, color: c.ink, borderRadius: 14, padding: 14, fontSize: 16, marginBottom: 10 } as const;
  return (
    <Page>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {([['post', 'Post'], ['testimony', 'Testimony'], ['prayer', 'Prayer request']] as [PostKind, string][]).map(([k, l]) => <Chip key={k} label={t(l)} on={kind === k} onPress={() => setKind(k)} />)}
      </View>
      <TextInput multiline value={body} onChangeText={setBody} placeholder={t('Share what God is doing…')} placeholderTextColor={c.mute} style={[field, { minHeight: 140, textAlignVertical: 'top' }]} />
      {kind === 'testimony' && <TextInput value={verse} onChangeText={setVerse} placeholder="📖 Psalm 103:2" placeholderTextColor={c.mute} style={field} />}
      {photo && <Image source={{ uri: photo }} style={{ width: '100%', height: 200, borderRadius: 14, marginBottom: 10 }} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label={'📷 ' + t('Photo')} onPress={pick} />
        {kind !== 'post' && <Chip label="🕶" on={anon} onPress={() => setAnon(!anon)} />}
      </View>
      <Text style={{ color: c.mute, fontWeight: '700', marginTop: 8, marginBottom: 6 }}>{t('Who will see it?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label={'🌍 ' + t('Everyone')} on={audience === 'all'} onPress={() => setAudience('all')} />
        <Chip label={'👥 ' + t('Friends')} on={audience === 'friends'} onPress={() => setAudience('friends')} />
      </View>
      <Button label={t('Publish')} onPress={publish} disabled={busy || !body.trim()} />
      <Pressable onPress={() => router.back()}><Text style={{ color: c.mute, textAlign: 'center', marginTop: 14 }}>{t('Close')}</Text></Pressable>
    </Page>
  );
}
