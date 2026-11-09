// ai-verse: the Bible reader's AI. The app sends a verse (or a chapter) and an action; this function checks the
// person, applies the daily limit, answers from the cache when it can, and otherwise asks the AI provider.
// Secrets live only here (supabase secrets set ...): AI_PROVIDER, AI_MODEL, ANTHROPIC_API_KEY or GEMINI_API_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Action = 'explain' | 'context' | 'original' | 'xrefs' | 'apply' | 'ask';
type Body = { action: Action; ref: string; text: string; lang: 'en' | 'ru'; question?: string };

const SYSTEM = `You are the Bible study companion inside faithBOOK, a Christian app used by evangelical churches.
You help people understand Scripture; you are not a pastor and never claim to be one.
- Ground every answer in the passage, its context and the wider Bible; quote references (book chapter:verse).
- Be warm, clear and short: plain words, no jargon, at most about 180 words unless the question needs more.
- Where Christians differ, say so briefly and fairly; do not invent doctrine or predict the future.
- No medical, legal or financial advice. If someone mentions self-harm, abuse or crisis, gently urge them to contact
  local emergency services or a crisis line now, and to speak with their pastor.
- Answer in the language of the request.`;

const TASK: Record<Action, string> = {
  explain: 'Explain what this passage says in plain words, and why it matters.',
  context: 'Give the context: who wrote it, to whom, when, and what comes just before and after.',
  original: 'Name 2–4 key words in the original Hebrew or Greek, transliterated, with their range of meaning and why it matters here.',
  xrefs: 'List 5–8 related verses (reference + a few words on how each connects).',
  apply: 'Give one question to reflect on today and a short prayer (3–4 lines) based on this passage.',
  ask: 'Answer the question about this passage.',
};

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });

async function hash(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callModel(prompt: string): Promise<string> {
  // Forgiving about how the settings were typed: case and spaces don't matter; with one key set, that provider is used.
  const env = (k: string) => (Deno.env.get(k) ?? '').trim();
  const hasGemini = !!env('GEMINI_API_KEY'), hasAnthropic = !!env('ANTHROPIC_API_KEY');
  let provider = env('AI_PROVIDER').toLowerCase();
  if (provider !== 'gemini' && provider !== 'anthropic') provider = hasGemini && !hasAnthropic ? 'gemini' : 'anthropic';
  if (provider === 'anthropic' && !hasAnthropic && hasGemini) provider = 'gemini';
  const model = env('AI_MODEL').replace(/^models\//, '');
  if (!model) throw new Error('AI_MODEL is not set');
  if (provider === 'gemini') {
    // Google's models are sometimes busy (503) or rate-limited (429): try the next one, as faithBOT does.
    const fallbacks = (env('AI_FALLBACK_MODELS') || 'gemini-flash-lite-latest,gemini-pro-latest').split(',').map(x => x.trim()).filter(Boolean);
    const models = [model, ...fallbacks].filter((m, i, a) => a.indexOf(m) === i);
    let last = '';
    const deadline = Date.now() + 100_000; // stay well inside the platform's 150-second limit
    for (const m of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const left = deadline - Date.now();
        if (left < 5_000) throw new Error(last || 'The AI is busy. Please try again in a minute.');
        let r: Response;
        try {
          r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${env('GEMINI_API_KEY')}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(Math.min(25_000, left)),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024 } }),
          });
        } catch {
          last = `${m}: no answer in time`;
          break; // too slow: try the next model
        }
        const d = await r.json().catch(() => ({}));
        if (r.ok) {
          const out = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
          if (out.trim()) return out;
          last = `${m}: empty answer`;
          break;
        }
        last = `Gemini ${r.status}: ${d?.error?.message ?? 'error'}`;
        if (r.status !== 503 && r.status !== 429 && r.status !== 404) throw new Error(last);
        if (r.status === 404) break;
        await new Promise(res => setTimeout(res, 800));
      }
    }
    throw new Error(last);
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    signal: AbortSignal.timeout(100_000),
    body: JSON.stringify({ model, max_tokens: 700, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${d?.error?.message ?? 'error'}`);
  return (d?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'Sign in to use the AI.' }, 401);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (!TASK[body.action] || !body.ref || !body.text) return json({ error: 'Bad request' }, 400);
  const text = String(body.text).slice(0, 6000);
  const question = String(body.question ?? '').slice(0, 500);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // The same verse and action is answered once and then served to everyone (questions are personal, never cached).
  const key = body.action === 'ask' ? '' : await hash([body.action, body.lang, body.ref, text].join('|'));
  if (key) {
    const { data } = await admin.from('ai_cache').select('answer, hits').eq('key', key).maybeSingle();
    if (data) { await admin.from('ai_cache').update({ hits: data.hits + 1 }).eq('key', key); return json({ answer: data.answer, cached: true }); }
  }

  // Free people get a few answers a day; Plus raises the limit (the subscription check comes with RevenueCat).
  const limit = Number(Deno.env.get('AI_FREE_DAILY_LIMIT') ?? 10);
  const today = new Date().toISOString().slice(0, 10);
  const { data: use } = await admin.from('ai_usage').select('count').eq('user_id', user.id).eq('day', today).maybeSingle();
  if ((use?.count ?? 0) >= limit) return json({ error: body.lang === 'ru' ? 'На сегодня лимит ответов исчерпан. faithBOOK Plus снимает ограничение.' : 'You have used today\'s AI answers. faithBOOK Plus removes the limit.' }, 429);

  const prompt = `${TASK[body.action]}\n\nPassage (${body.ref}):\n${text}${question ? `\n\nQuestion: ${question}` : ''}\n\nAnswer in ${body.lang === 'ru' ? 'Russian' : 'English'}.`;
  let answer = '';
  try { answer = (await callModel(prompt)).trim(); } catch (e) { return json({ error: String((e as Error).message) }, 502); }
  if (!answer) return json({ error: 'No answer' }, 502);

  await admin.from('ai_usage').upsert({ user_id: user.id, day: today, count: (use?.count ?? 0) + 1 });
  if (key) await admin.from('ai_cache').upsert({ key, answer });
  return json({ answer });
});
