// The heavenly-blue look of faithBOT, carried over: light sky, glass cards, one blue accent.
import { useColorScheme } from 'react-native';

const light = {
  bg: '#EEF3FE', bg2: '#E6ECFB', card: '#FFFFFF', ink: '#1E2233', mute: '#69718A', line: 'rgba(120,140,200,0.22)',
  accent: '#4F66C9', accentSoft: '#E9EEFD', gold: '#C79A3A', good: '#2F8F4E', bad: '#E5484D', flame: '#FF6A3D',
};
const dark: typeof light = {
  bg: '#0E152D', bg2: '#16204A', card: '#18224A', ink: '#EEF2FF', mute: '#9DA8CC', line: 'rgba(160,180,255,0.16)',
  accent: '#9DB2FF', accentSoft: '#1F2B5C', gold: '#E2B95C', good: '#8BE3A8', bad: '#FF8A8D', flame: '#FF8A5C',
};

export type Palette = typeof light;
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { card: 22, chip: 999, field: 14 };
export const space = (n: number) => n * 8;
