// The verse toolbar and the "ask anything" bar. The app never holds an AI key: it calls the ai-verse Edge Function.
import { isPreview, supabase } from './supabase';

export type VerseAction = 'explain' | 'context' | 'original' | 'xrefs' | 'apply' | 'ask';
export const ACTIONS: { key: Exclude<VerseAction, 'ask'>; label: string; icon: string }[] = [
  { key: 'explain', label: 'Explain', icon: '💡' },
  { key: 'context', label: 'Context', icon: '🧭' },
  { key: 'original', label: 'Original words', icon: '📜' },
  { key: 'xrefs', label: 'Cross-references', icon: '🔗' },
  { key: 'apply', label: 'Apply', icon: '🙏' },
];

export type VerseQuery = { action: VerseAction; ref: string; text: string; lang: 'en' | 'ru'; question?: string };

const SAMPLE: Record<string, string> = {
  explain: 'In preview mode the AI is not connected yet. Once the ai-verse function is deployed, this verse is explained in plain words: what it says, why it matters, and how it fits the chapter.',
  ask: 'In preview mode the AI is not connected yet. Deploy the ai-verse function and add your AI key to get real answers here.',
};

export async function askVerse(q: VerseQuery): Promise<string> {
  if (isPreview || !supabase) {
    await new Promise(r => setTimeout(r, 500));
    return SAMPLE[q.action] ?? SAMPLE.explain;
  }
  const { data, error } = await supabase.functions.invoke('ai-verse', { body: q });
  if (error) throw error;
  const answer = (data as { answer?: string; error?: string })?.answer;
  if (!answer) throw new Error((data as { error?: string })?.error ?? 'No answer');
  return answer;
}
