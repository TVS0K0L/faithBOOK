-- faithBOOK · Phase 1 schema: people, churches, the wall, Bible study, AI usage, progress and safety.
-- Every table has row-level security: a person reads and writes only what they may, enforced in the database.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  handle text unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  lang text not null default 'en' check (lang in ('en', 'ru')),
  church_id uuid,
  bio text not null default '' check (char_length(bio) <= 400),
  work text not null default '',
  company text not null default '',
  business text not null default '',
  contacts text not null default '',
  hobbies text not null default '',
  looking_for text not null default '',
  links text[] not null default '{}',
  visibility text not null default 'all' check (visibility in ('all', 'friends')),
  is_minor boolean not null default false,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

-- A profile is made the moment someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followee uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

create table public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  primary key (blocker, blocked)
);

-- ---------------------------------------------------------------------------
-- Churches (basic in Phase 1: a name and its members; the church plan comes in Phase 3)
-- ---------------------------------------------------------------------------
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  country text not null default '',
  verified boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_church_fk foreign key (church_id) references public.churches (id) on delete set null;

create table public.church_members (
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'leader', 'mentor', 'pastor', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (church_id, user_id)
);

-- ---------------------------------------------------------------------------
-- The wall
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'post' check (kind in ('post', 'testimony', 'prayer', 'event', 'poll', 'announcement', 'share', 'auto')),
  body text not null default '' check (char_length(body) <= 5000),
  verse_ref text,
  verse_text text,
  media_url text,
  media_status text not null default 'none' check (media_status in ('none', 'pending', 'approved', 'rejected')),
  audience text not null default 'all' check (audience in ('all', 'friends', 'church')),
  church_id uuid references public.churches (id) on delete cascade,
  anonymous boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id);

create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) <= 8),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.prayers (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Bible study and AI
-- ---------------------------------------------------------------------------
create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  translation text not null,
  book smallint not null check (book between 1 and 66),
  chapter smallint not null,
  v1 smallint not null,
  v2 smallint not null,
  color text not null default 'blue',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.ai_cache (
  key text primary key,
  answer text not null,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Progress and safety
-- ---------------------------------------------------------------------------
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  amount integer not null check (amount between 0 and 1000),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Who may see what
-- ---------------------------------------------------------------------------
create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships f where f.status = 'accepted' and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;

create function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks x where (x.blocker = a and x.blocked = b) or (x.blocker = b and x.blocked = a));
$$;

create function public.can_see_post(p public.posts) returns boolean
language sql stable security definer set search_path = public as $$
  select p.author_id = auth.uid()
    or (not p.hidden and p.media_status <> 'rejected' and not public.is_blocked(auth.uid(), p.author_id) and (
      p.audience = 'all'
      or (p.audience = 'friends' and public.are_friends(auth.uid(), p.author_id))
      or (p.audience = 'church' and exists (select 1 from church_members m where m.church_id = p.church_id and m.user_id = auth.uid()))
    ));
$$;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.churches enable row level security;
alter table public.church_members enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.prayers enable row level security;
alter table public.highlights enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_usage enable row level security;
alter table public.xp_events enable row level security;
alter table public.reports enable row level security;

create policy "profiles are visible to signed-in people" on public.profiles for select to authenticated
  using (id = auth.uid() or visibility = 'all' or public.are_friends(auth.uid(), id));
create policy "you edit your own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "follows are visible" on public.follows for select to authenticated using (true);
create policy "you follow for yourself" on public.follows for insert to authenticated with check (follower = auth.uid());
create policy "you unfollow for yourself" on public.follows for delete to authenticated using (follower = auth.uid());

create policy "your friendships" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "you ask" on public.friendships for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy "they answer" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
create policy "either ends it" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

create policy "your blocks" on public.blocks for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());

create policy "churches are visible" on public.churches for select to authenticated using (true);
create policy "anyone can start a church" on public.churches for insert to authenticated with check (created_by = auth.uid());
create policy "members are visible" on public.church_members for select to authenticated using (true);
create policy "you join as a member" on public.church_members for insert to authenticated with check (user_id = auth.uid() and role = 'member');
create policy "you leave" on public.church_members for delete to authenticated using (user_id = auth.uid());

create policy "posts you may see" on public.posts for select to authenticated using (public.can_see_post(posts));
create policy "you post as yourself" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and kind in ('post', 'testimony', 'prayer', 'event', 'poll', 'share')
    and (audience <> 'church' or exists (select 1 from church_members m where m.church_id = posts.church_id and m.user_id = auth.uid())));
create policy "you edit your posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "you delete your posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "reactions on posts you see" on public.reactions for select to authenticated using (exists (select 1 from posts p where p.id = post_id and public.can_see_post(p)));
create policy "your reactions" on public.reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments on posts you see" on public.comments for select to authenticated using (exists (select 1 from posts p where p.id = post_id and public.can_see_post(p)));
create policy "you comment as yourself" on public.comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and public.can_see_post(p)));
create policy "you delete your comments" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "prayers on posts you see" on public.prayers for select to authenticated using (exists (select 1 from posts p where p.id = post_id and public.can_see_post(p)));

create policy "your highlights" on public.highlights for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "your AI usage" on public.ai_usage for select to authenticated using (user_id = auth.uid());
create policy "your XP" on public.xp_events for select to authenticated using (user_id = auth.uid());
create policy "you report" on public.reports for insert to authenticated with check (reporter = auth.uid());
-- ai_cache: no policies, so only the server (service role) reads and writes it.

-- ---------------------------------------------------------------------------
-- Actions that need more than one write
-- ---------------------------------------------------------------------------
create function public.add_xp(p_user uuid, p_source text, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into xp_events (user_id, source, amount) values (p_user, p_source, p_amount);
  update profiles set xp = xp + p_amount where id = p_user;
end $$;
revoke execute on function public.add_xp(uuid, text, integer) from public, anon, authenticated;

create function public.toggle_reaction(p_post uuid, p_kind text) returns void
language plpgsql security invoker set search_path = public as $$
declare had text;
begin
  select kind into had from reactions where post_id = p_post and user_id = auth.uid();
  if had = p_kind then delete from reactions where post_id = p_post and user_id = auth.uid();
  elsif had is null then insert into reactions (post_id, user_id, kind) values (p_post, auth.uid(), p_kind);
  else update reactions set kind = p_kind where post_id = p_post and user_id = auth.uid();
  end if;
end $$;

-- "I prayed": once per person and request; 5 XP to the one who prayed.
create function public.i_prayed(p_post uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare p posts; n integer;
begin
  select * into p from posts where id = p_post;
  if p.id is null or p.kind <> 'prayer' or not public.can_see_post(p) then raise exception 'not found'; end if;
  insert into prayers (post_id, user_id) values (p_post, auth.uid()) on conflict do nothing;
  if found then perform public.add_xp(auth.uid(), 'prayed', 5); end if;
  select count(*) into n from prayers where post_id = p_post;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- The feed: what the reader may see, with counts, ranked by closeness, engagement and freshness
-- (halves every 30 hours). The view runs with the reader's rights, so the policies above apply.
-- ---------------------------------------------------------------------------
create view public.feed with (security_invoker = on) as
select
  p.id, p.author_id, p.kind, p.body, p.verse_ref, p.verse_text, p.media_url, p.audience, p.anonymous, p.created_at,
  case when p.anonymous and p.author_id <> auth.uid() then 'Anonymous' else coalesce(a.name, '') end as author_name,
  (select count(*) from reactions r where r.post_id = p.id)::int as reactions,
  (select count(*) from comments c where c.post_id = p.id)::int as comments,
  (select count(*) from prayers x where x.post_id = p.id)::int as prayed,
  (select r.kind from reactions r where r.post_id = p.id and r.user_id = auth.uid()) as my_reaction,
  exists (select 1 from prayers x where x.post_id = p.id and x.user_id = auth.uid()) as i_prayed,
  (
    (case p.kind when 'testimony' then 1.3 when 'prayer' then 1.25 when 'announcement' then 1.6 when 'auto' then 0.7 else 1.0 end)
    * (1
       + case when public.are_friends(auth.uid(), p.author_id) then 2 else 0 end
       + case when exists (select 1 from follows f where f.follower = auth.uid() and f.followee = p.author_id) then 1.5 else 0 end
       + case when p.audience = 'church' then 1.5 else 0 end
       + 0.6 * ln(1 + (select count(*) from reactions r where r.post_id = p.id)
                    + 2 * (select count(*) from comments c where c.post_id = p.id)
                    + (select count(*) from prayers x where x.post_id = p.id)))
    * power(0.5, extract(epoch from (now() - p.created_at)) / 3600 / 30)
  )::float8 as score
from public.posts p
left join public.profiles a on a.id = p.author_id;

grant select on public.feed to authenticated;
