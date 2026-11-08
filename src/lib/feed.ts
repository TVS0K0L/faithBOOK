// The community wall: read the ranked feed, post, react, say "I prayed". Preview mode keeps sample posts on the phone.
import { isPreview, supabase } from './supabase';

export type PostKind = 'post' | 'testimony' | 'prayer' | 'event' | 'poll' | 'announcement';
export type Post = {
  id: string; author_id: string; author_name: string; kind: PostKind; body: string; verse_ref: string | null; verse_text: string | null;
  media_url: string | null; audience: 'all' | 'friends' | 'church'; anonymous: boolean; created_at: string;
  reactions: number; comments: number; prayed: number; my_reaction: string | null; i_prayed: boolean;
};

let SAMPLE: Post[] = [
  { id: 's1', author_id: 'd', author_name: 'Diana', kind: 'testimony', body: 'After three years of pain, my back was healed during Thursday\'s prayer meeting. I can run again! Glory to God.', verse_ref: 'Psalm 103:2–3', verse_text: 'Praise the LORD, my soul, and forget not all his benefits — who forgives all your sins and heals all your diseases.', media_url: null, audience: 'all', anonymous: false, created_at: new Date(Date.now() - 2 * 3600e3).toISOString(), reactions: 27, comments: 6, prayed: 0, my_reaction: null, i_prayed: false },
  { id: 's2', author_id: 'x', author_name: 'Anonymous', kind: 'prayer', body: 'Please pray for my father: he has surgery on Monday. I feel anxious but I trust God.', verse_ref: null, verse_text: null, media_url: null, audience: 'all', anonymous: true, created_at: new Date(Date.now() - 20 * 3600e3).toISOString(), reactions: 18, comments: 9, prayed: 23, my_reaction: null, i_prayed: false },
  { id: 's3', author_id: 'm', author_name: 'Mark', kind: 'post', body: 'Worship evening on the roof this Saturday at 19:00. Bring a friend and a blanket!', verse_ref: null, verse_text: null, media_url: null, audience: 'all', anonymous: false, created_at: new Date(Date.now() - 30 * 3600e3).toISOString(), reactions: 10, comments: 2, prayed: 0, my_reaction: null, i_prayed: false },
];

export async function loadFeed(kind?: PostKind): Promise<Post[]> {
  if (isPreview || !supabase) return SAMPLE.filter(p => !kind || p.kind === kind);
  let q = supabase.from('feed').select('*').order('score', { ascending: false }).limit(50);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function createPost(p: { kind: PostKind; body: string; verse_ref?: string; audience: Post['audience']; anonymous?: boolean; media_url?: string | null }) {
  if (isPreview || !supabase) {
    SAMPLE = [{ id: 'l' + Date.now(), author_id: 'me', author_name: 'You', kind: p.kind, body: p.body, verse_ref: p.verse_ref ?? null, verse_text: null, media_url: p.media_url ?? null, audience: p.audience, anonymous: !!p.anonymous, created_at: new Date().toISOString(), reactions: 0, comments: 0, prayed: 0, my_reaction: null, i_prayed: false }, ...SAMPLE];
    return;
  }
  const { error } = await supabase.from('posts').insert({ kind: p.kind, body: p.body, verse_ref: p.verse_ref || null, audience: p.audience, anonymous: !!p.anonymous, media_url: p.media_url ?? null });
  if (error) throw error;
}

export async function react(post: Post, kind: string) {
  if (isPreview || !supabase) { SAMPLE = SAMPLE.map(x => x.id === post.id ? { ...x, my_reaction: x.my_reaction === kind ? null : kind, reactions: x.reactions + (x.my_reaction === kind ? -1 : x.my_reaction ? 0 : 1) } : x); return; }
  const { error } = await supabase.rpc('toggle_reaction', { p_post: post.id, p_kind: kind });
  if (error) throw error;
}

export async function prayFor(post: Post) {
  if (isPreview || !supabase) { SAMPLE = SAMPLE.map(x => x.id === post.id && !x.i_prayed ? { ...x, i_prayed: true, prayed: x.prayed + 1 } : x); return; }
  const { error } = await supabase.rpc('i_prayed', { p_post: post.id });
  if (error) throw error;
}

export function ago(iso: string) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h`;
  return `${Math.floor(m / 1440)} d`;
}
