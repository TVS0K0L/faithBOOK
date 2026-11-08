import { Text } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { usePalette } from '../../theme';
import { t } from '../../lib/i18n';

const icon = (e: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{e}</Text>;

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.mute, tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line } }}>
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="bible" options={{ title: t('Bible'), tabBarIcon: icon('📖') }} />
      <Tabs.Screen name="community" options={{ title: t('Community'), tabBarIcon: icon('🌍') }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: icon('🪪') }} />
    </Tabs>
  );
}
