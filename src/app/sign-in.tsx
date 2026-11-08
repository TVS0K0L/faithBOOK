// Sign in: Apple on iPhone (required by the App Store when other logins exist), and email links everywhere.
import { useState } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Button, Page } from '../components/ui';
import { usePalette } from '../theme';
import { t } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export default function SignIn() {
  const c = usePalette();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const apple = async () => {
    if (!supabase) return;
    try {
      const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!cred.identityToken) return;
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (!error) router.back(); else setMsg(error.message);
    } catch { /* cancelled */ }
  };
  const magic = async () => {
    if (!supabase || !email.includes('@')) return;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setMsg(error ? error.message : t('Check your email for the sign-in link.'));
  };

  return (
    <Page>
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{ height: 50, marginBottom: 18 }} onPress={apple} />
      )}
      <TextInput value={email} onChangeText={setEmail} placeholder={t('Your email')} placeholderTextColor={c.mute} autoCapitalize="none" keyboardType="email-address"
        style={{ backgroundColor: c.card, color: c.ink, borderRadius: 14, padding: 14, fontSize: 16 }} />
      <Button label={t('Sign in with email')} onPress={magic} />
      {!!msg && <Text style={{ color: c.mute, marginTop: 14, textAlign: 'center' }}>{msg}</Text>}
    </Page>
  );
}
