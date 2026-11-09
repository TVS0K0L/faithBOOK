// ai-verse: the Bible reader's AI. The app sends a verse (or a chapter) and an action; this function checks the
// person, applies the daily limit, answers from the cache when it can, and otherwise asks the AI provider.
// Secrets live only here (supabase secrets set ...): AI_PROVIDER, AI_MODEL, ANTHROPIC_API_KEY or GEMINI_API_KEY.
//
// Speed: the toolbar uses a fast model with thinking off; if it hasn't answered in a few seconds a second model
// starts in parallel and the first answer wins ("hedging"); with `stream: true` the answer arrives word by word.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Action = 'explain' | 'context' | 'original' | 'xrefs' | 'apply' | 'ask';
type Body = { action: Action; ref: string; text: string; lang: 'en' | 'ru'; question?: string; stream?: boolean };

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

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const env = (k: string) => (Deno.env.get(k) ?? '').trim();

async function hash(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ----- which provider and models -----
function provider(): 'gemini' | 'anthropic' {
  const hasGemini = !!env('GEMINI_API_KEY'), hasAnthropic = !!env('ANTHROPIC_API_KEY');
  const p = env('AI_PROVIDER').toLowerCase();
  if (p === 'gemini' || (p !== 'anthropic' && hasGemini && !hasAnthropic)) return 'gemini';
  return hasAnthropic || !hasGemini ? 'anthropic' : 'gemini';
}

/** Toolbar buttons: the fast model first. Free questions: the main model first. */
function geminiModels(action: Action): string[] {
  const main = env('AI_MODEL').replace(/^models\//, '') || 'gemini-flash-latest';
  const fast = env('AI_FAST_MODEL') || 'gemini-flash-lite-latest';
  const extra = env('AI_FALLBACK_MODELS').split(',').map(x => x.trim()).filter(Boolean);
  const order = (action === 'ask' ? [main, fast, ...extra] : [fast, main, ...extra]).filter((m, i, a) => m && a.indexOf(m) === i);
  // A second try of the fast model at the end: Google's response time varies a lot, and a fresh request often beats a slow one.
  return [...order, fast];
}

type Log = { model: string; ms: number; result: string }[];
const NO_THINK_OFF = new Set<string>(); // models that refuse "thinking off" (remembered while this server instance lives)

/** One Gemini call. `think: false` asks the model to answer directly (much faster for short answers). */
function geminiRequest(model: string, prompt: string, think: boolean, stream: boolean, signal: AbortSignal) {
  const cfg: Record<string, unknown> = { maxOutputTokens: 1024 };
  if (!think) cfg.thinkingConfig = { thinkingBudget: 0 };
  const verb = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${verb}key=${env('GEMINI_API_KEY')}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: cfg }),
  });
}

/** Asks one model, fast: thinking off; if the model refuses that setting, again with its default. */
async function geminiOnce(model: string, prompt: string, signal: AbortSignal, log: Log): Promise<string> {
  for (const think of NO_THINK_OFF.has(model) ? [true] : [false, true]) {
    const t = Date.now();
    const r = await geminiRequest(model, prompt, think, false, signal);
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      const out = (d?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('').trim();
      log.push({ model, ms: Date.now() - t, result: out ? 'ok' : 'empty' });
      if (out) return out;
      throw new Error(`${model}: empty answer`);
    }
    const msg = String(d?.error?.message ?? r.status);
    log.push({ model, ms: Date.now() - t, result: `${r.status} ${msg.slice(0, 80)}` });
    if (r.status === 400 && !think) { NO_THINK_OFF.add(model); continue; } // this model doesn't accept "thinking off": ask again with its default
    throw Object.assign(new Error(`Gemini ${r.status}: ${msg}`), { status: r.status });
  }
  throw new Error(`${model}: no answer`);
}

/** Hedged race: start the first model; every few seconds without an answer, start the next one too. First answer wins. */
async function geminiAnswer(action: Action, prompt: string, log: Log): Promise<{ text: string; model: string }> {
  const models = geminiModels(action);
  const hedgeMs = Number(env('AI_HEDGE_MS') || 3500);
  const controllers: AbortController[] = [];
  const overall = AbortSignal.timeout(90_000);
  return await new Promise((resolve, reject) => {
    let started = 0, failed = 0, done = false;
    const errors: string[] = [];
    const start = () => {
      if (done || started >= models.length) return;
      const m = models[started++];
      const c = new AbortController();
      controllers.push(c);
      overall.addEventListener('abort', () => c.abort());
      const perTry = setTimeout(() => c.abort(), 25_000); // a model that hangs is dropped, the others go on
      geminiOnce(m, prompt, c.signal, log).finally(() => clearTimeout(perTry)).then(text => {
        if (done) return;
        done = true;
        controllers.forEach(x => x !== c && x.abort());
        resolve({ text, model: m });
      }).catch(e => {
        if (done) return;
        errors.push(String((e as Error).message));
        failed++;
        if (started < models.length) start(); // failed fast (busy, rate limit): the next one at once
        else if (failed >= started) { done = true; reject(new Error(errors.at(-1) || 'The AI is busy. Please try again in a minute.')); }
      });
      setTimeout(() => { if (!done) start(); }, hedgeMs); // slow: hedge with the next one
    };
    start();
    overall.addEventListener('abort', () => { if (!done) { done = true; reject(new Error('The AI is busy. Please try again in a minute.')); } });
  });
}

/** Streaming: the first model that starts writing within a few seconds streams its words to the app. */
async function geminiStream(action: Action, prompt: string, log: Log, onText: (t: string) => Promise<void>): Promise<string> {
  const models = geminiModels(action);
  const firstTokenMs = Number(env('AI_FIRST_TOKEN_MS') || 4000);
  let lastErr = 'The AI is busy. Please try again in a minute.';
  for (const m of models) {
    for (const think of NO_THINK_OFF.has(m) ? [true] : [false, true]) {
      const c = new AbortController();
      const t = Date.now();
      const timer = setTimeout(() => c.abort(), firstTokenMs);
      let r: Response;
      try { r = await geminiRequest(m, prompt, think, true, c.signal); } catch { log.push({ model: m, ms: Date.now() - t, result: 'no start in time' }); break; }
      if (!r.ok) {
        clearTimeout(timer);
        const d = await r.json().catch(() => ({}));
        const msg = String(d?.error?.message ?? r.status);
        log.push({ model: m, ms: Date.now() - t, result: `${r.status} ${msg.slice(0, 80)}` });
        lastErr = `Gemini ${r.status}: ${msg}`;
        if (r.status === 400 && !think) { NO_THINK_OFF.add(m); continue; }
        break;
      }
      let full = '', buf = '', first = true;
      try {
        const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const d = JSON.parse(line.slice(5));
            const piece = (d?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
            if (!piece) continue;
            if (first) { clearTimeout(timer); first = false; log.push({ model: m, ms: Date.now() - t, result: 'first words' }); }
            full += piece;
            await onText(piece);
          }
        }
      } catch {
        if (!full) { log.push({ model: m, ms: Date.now() - t, result: 'no start in time' }); break; }
      } finally { clearTimeout(timer); }
      if (full.trim()) { log.push({ model: m, ms: Date.now() - t, result: 'done' }); return full; }
      break;
    }
  }
  throw new Error(lastErr);
}

async function anthropicAnswer(prompt: string, log: Log): Promise<{ text: string; model: string }> {
  const model = env('AI_MODEL');
  if (!model) throw new Error('AI_MODEL is not set');
  const t = Date.now();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 700, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  });
  const d = await r.json();
  log.push({ model, ms: Date.now() - t, result: String(r.status) });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${d?.error?.message ?? 'error'}`);
  return { text: (d?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join(''), model };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  const t0 = Date.now();
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const [userRes, body] = await Promise.all([asUser.auth.getUser(), req.json().catch(() => null) as Promise<Body | null>]);
  const user = userRes.data.user;
  if (!user) return json({ error: 'Sign in to use the AI.' }, 401);
  if (!body) return json({ error: 'Bad request' }, 400);
  if (!TASK[body.action] || !body.ref || !body.text) return json({ error: 'Bad request' }, 400);
  const text = String(body.text).slice(0, 6000);
  const question = String(body.question ?? '').slice(0, 500);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // The same verse and action is answered once and then served to everyone (questions are personal, never cached).
  const key = body.action === 'ask' ? '' : await hash([body.action, body.lang, body.ref, text].join('|'));
  const today = new Date().toISOString().slice(0, 10);
  const [cached, usage] = await Promise.all([
    key ? admin.from('ai_cache').select('answer, hits').eq('key', key).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('ai_usage').select('count').eq('user_id', user.id).eq('day', today).maybeSingle(),
  ]);
  {
    const data = cached.data as { answer: string; hits: number } | null;
    if (data) {
      admin.from('ai_cache').update({ hits: data.hits + 1 }).eq('key', key).then(() => {});
      return json({ answer: data.answer, cached: true, ms: Date.now() - t0 });
    }
  }

  // Free people get a few answers a day; Plus raises the limit (the subscription check comes with RevenueCat).
  const limit = Number(env('AI_FREE_DAILY_LIMIT') || 10);
  const use = usage.data as { count: number } | null;
  if ((use?.count ?? 0) >= limit) return json({ error: body.lang === 'ru' ? 'На сегодня лимит ответов исчерпан. faithBOOK Plus снимает ограничение.' : 'You have used today\'s AI answers. faithBOOK Plus removes the limit.' }, 429);

  const prompt = `${TASK[body.action]}\n\nPassage (${body.ref}):\n${text}${question ? `\n\nQuestion: ${question}` : ''}\n\nAnswer in ${body.lang === 'ru' ? 'Russian' : 'English'}.`;
  const log: Log = [];
  const save = async (answer: string) => {
    await admin.from('ai_usage').upsert({ user_id: user.id, day: today, count: (use?.count ?? 0) + 1 });
    if (key) await admin.from('ai_cache').upsert({ key, answer });
  };

  // Word by word (Server-Sent Events): {"t": "..."} pieces, then {"done": true}, or {"error": "..."}.
  if (body.stream && provider() === 'gemini') {
    const enc = new TextEncoder();
    const out = new TransformStream<Uint8Array, Uint8Array>();
    const w = out.writable.getWriter();
    const send = (o: unknown) => w.write(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
    (async () => {
      try {
        const answer = await geminiStream(body.action, prompt, log, piece => send({ t: piece }));
        await save(answer.trim());
        await send({ done: true, ms: Date.now() - t0, log });
      } catch (e) { await send({ error: String((e as Error).message), log }); }
      finally { await w.close(); }
    })();
    return new Response(out.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...CORS } });
  }

  try {
    const r = provider() === 'gemini' ? await geminiAnswer(body.action, prompt, log) : await anthropicAnswer(prompt, log);
    const answer = r.text.trim();
    if (!answer) return json({ error: 'No answer', log }, 502);
    // Saved after the reply goes out, so the person doesn't wait for it.
    const saving = save(answer).catch(() => {});
    const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(saving); else await saving;
    return json({ answer, model: r.model, ms: Date.now() - t0, log });
  } catch (e) {
    return json({ error: String((e as Error).message), log }, 502);
  }
});
