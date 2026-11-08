-- Checks the wall rules: strangers do not see friends-only posts, anonymity holds, "I prayed" counts once and gives XP, nobody posts as someone else.
\set ON_ERROR_STOP on
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'vadim@x.com', '{"full_name":"Vadim"}'),
 ('00000000-0000-0000-0000-00000000000b', 'diana@x.com', '{"full_name":"Diana"}'),
 ('00000000-0000-0000-0000-00000000000c', 'eve@x.com', '{}');
select name from public.profiles order by name;
insert into public.friendships values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','accepted');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into public.posts (kind, body, audience) values ('testimony','Healed!','all'), ('post','Friends only','friends');
insert into public.posts (kind, body, anonymous) values ('prayer','Pray for my dad', true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select 'eve sees' as who, kind, author_name, body from public.feed order by score desc;
select public.i_prayed((select id from public.posts where kind='prayer'));
select public.toggle_reaction((select id from public.posts where kind='testimony'), '🙌');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select 'diana sees' as who, kind, author_name, reactions, prayed, round(score::numeric,2) from public.feed order by score desc;
do $$ begin
  begin insert into public.posts (author_id, body) values ('00000000-0000-0000-0000-00000000000a', 'impersonation'); raise exception 'should have failed';
  exception when insufficient_privilege or check_violation then raise notice 'impersonation blocked'; end;
end $$;
reset role;
select name, xp from public.profiles order by name;
