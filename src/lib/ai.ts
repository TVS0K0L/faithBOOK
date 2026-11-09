// The verse toolbar and the "ask anything" bar. The app never holds an AI key: it calls the ai-verse Edge Function.
// Answers stream in word by word (expo/fetch can read a response as it arrives), so the first words show in about a second.
import { fetch as expoFetch } from 'expo/fetch';
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

const SAMPLE = 'In preview mode the AI is not connected yet. Once the ai-verse function is deployed, this verse is explained in plain words: what it says, why it matters, and how it fits the chapter.';
const FN_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '') + '/functions/v1/ai-verse';

/** Streams the answer: onText gets each new piece; resolves with the whole answer. */
export async function askVerseStream(q: VerseQuery, onText: (piece: string) => void): Promise<string> {
  if (isPreview || !supabase) {
    let out = '';
    for (const w of SAMPLE.split(' ')) { await new Promise(r => setTimeout(r, 25)); out += w + ' '; onText(w + ' '); }
    return out.trim();
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to use the AI.');
  const res = await expoFetch(FN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...q, stream: true }),
  });
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/event-stream')) { // a cached answer (or an error) comes back whole
    const d = (await res.json()) as { answer?: string; error?: string };
    if (!d.answer) throw new Error(d.error ?? 'No answer');
    onText(d.answer);
    return d.answer;
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '', all = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith('data:')) continue;
      const d = JSON.parse(line.slice(5)) as { t?: string; done?: boolean; error?: string };
      if (d.t) { all += d.t; onText(d.t); }
      if (d.error && !all) throw new Error(d.error);
    }
  }
  return all.trim();
}
