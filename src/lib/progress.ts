// XP, levels and the daily streak: the same curve as faithBOT (quick at first, then steeper).
import AsyncStorage from '@react-native-async-storage/async-storage';

export const needXp = (lv: number) => Math.round(200 + 10 * Math.pow(lv, 1.6));

export function levelOf(xp: number) {
  let lv = 1, left = Math.max(0, xp);
  while (lv < 100 && left >= needXp(lv)) { left -= needXp(lv); lv++; }
  return { lv, into: left, need: needXp(lv) };
}

export type Progress = { xp: number; streak: number; best: number; last: string };
const KEY = 'progress:v1';
const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export async function loadProgress(): Promise<Progress> {
  try { const s = await AsyncStorage.getItem(KEY); if (s) return JSON.parse(s) as Progress; } catch { /* new */ }
  return { xp: 0, streak: 0, best: 0, last: '' };
}

/** Adds XP for an action and keeps the streak (one active day counts once). */
export async function earn(xp: number): Promise<Progress> {
  const p = await loadProgress();
  const d = today();
  if (p.last !== d) {
    p.streak = p.last && dayDiff(p.last, d) === 1 ? p.streak + 1 : 1;
    p.best = Math.max(p.best, p.streak);
    p.last = d;
  }
  p.xp += xp;
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
  return p;
}
