import { createClient } from '@supabase/supabase-js';
// End-to-end test on a real Supabase project: two temporary users post, react and pray; then they are deleted.
// Usage: SB_URL=... SB_PUBLISHABLE=... SB_SECRET=<service role key> node supabase/tests/e2e.mjs
const url = process.env.SB_URL, pub = process.env.SB_PUBLISHABLE, sec = process.env.SB_SECRET;
const admin = createClient(url, sec, { auth: { persistSession: false } });
const mk = async (email, name) => { const { data, error } = await admin.auth.admin.createUser({ email, password: 'Test-' + Math.random().toString(36).slice(2) + 'A1!', email_confirm: true, user_metadata: { full_name: name } }); if (error) throw error; return data.user; };
const ids = [];
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
try {
  const pw = 'Pw-' + Date.now() + 'x!';
  const A = await admin.auth.admin.createUser({ email: `e2e-a-${Date.now()}@faithbook.test`, password: pw, email_confirm: true, user_metadata: { full_name: 'Test Vadim' } }); if (A.error) throw A.error; ids.push(A.data.user.id);
  const B = await admin.auth.admin.createUser({ email: `e2e-b-${Date.now()}@faithbook.test`, password: pw, email_confirm: true, user_metadata: { full_name: 'Test Diana' } }); ids.push(B.data.user.id);
  const a = createClient(url, pub, { auth: { persistSession: false } }), b = createClient(url, pub, { auth: { persistSession: false } });
  await a.auth.signInWithPassword({ email: A.data.user.email, password: pw }); await b.auth.signInWithPassword({ email: B.data.user.email, password: pw });
  const prof = await a.from('profiles').select('name').eq('id', ids[0]).single(); ok(prof.data?.name === 'Test Vadim', 'profile made on sign-up');
  let r = await a.from('posts').insert({ kind: 'testimony', body: 'E2E: God is faithful', verse_ref: 'Lamentations 3:23' }); ok(!r.error, 'post a testimony ' + (r.error?.message || ''));
  r = await a.from('posts').insert({ kind: 'prayer', body: 'E2E: pray for exams', anonymous: true }); ok(!r.error, 'post an anonymous prayer request');
  r = await a.from('posts').insert({ kind: 'post', body: 'E2E: friends only', audience: 'friends' }); ok(!r.error, 'post for friends');
  r = await a.from('posts').insert({ author_id: ids[1], body: 'impersonation' }); ok(!!r.error, 'cannot post as someone else');
  let f = await b.from('feed').select('*').order('score', { ascending: false });
  ok(f.data?.some(p => p.body.includes('God is faithful')) && !f.data?.some(p => p.body.includes('friends only')), 'the other person sees public posts, not friends-only');
  const pr = f.data.find(p => p.kind === 'prayer'); ok(pr?.author_name === 'Anonymous', 'anonymous stays anonymous');
  const t = f.data.find(p => p.kind === 'testimony');
  r = await b.rpc('toggle_reaction', { p_post: t.id, p_kind: '🙌' }); ok(!r.error, 'react');
  r = await b.rpc('i_prayed', { p_post: pr.id }); ok(r.data === 1, 'I prayed counts 1');
  r = await b.rpc('i_prayed', { p_post: pr.id }); ok(r.data === 1, 'praying twice still counts 1');
  f = await a.from('feed').select('*').eq('id', t.id).single(); ok(f.data.reactions === 1, 'the author sees the reaction');
  const xp = await b.from('profiles').select('xp').eq('id', ids[1]).single(); ok(xp.data.xp === 5, 'the one who prayed got 5 XP');
} catch (e) { console.log('ERROR', e.message); process.exitCode = 1; }
finally { for (const id of ids) await admin.auth.admin.deleteUser(id); console.log('test users removed:', ids.length); }
