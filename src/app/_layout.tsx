import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePalette } from '../theme';
import { t } from '../lib/i18n';

export default function RootLayout() {
  const c = usePalette();
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTintColor: c.accent, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.ink }, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="read/[book]/[chapter]" options={{ title: t('Bible') }} />
        <Stack.Screen name="compose" options={{ title: t('New post'), presentation: 'modal' }} />
        <Stack.Screen name="sign-in" options={{ title: t('Sign in'), presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
