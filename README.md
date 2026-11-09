# faithBOOK

The Christian app for the whole week: the Bible with an AI study companion, the church's community wall,
growth you can see (XP, streaks, the Challenge of Krest), and — in later phases — reels, worship, safe faith-based
dating, churches and a small marketplace. iOS first, then Android and Huawei, from one codebase.

faithBOOK grows out of **faithBOT**, the Telegram bot and mini app already used by the church «Любовь Христа».
The full product plan, business model, architecture and roadmap are in the plan document (see `docs/PLAN.md`).

## What is in this first version (Phase 1 start)

| Area | Status |
| --- | --- |
| App shell: tabs (Home, Bible, Community, Profile), light and dark themes, English and Russian | done |
| Bible reader: 66 books, World English Bible and Russian Synodal (public domain), chapters cached on the phone | done |
| AI verse toolbar: select verses → Explain, Context, Original words, Cross-references, Apply; "ask anything" bar | done (app + server function) |
| Community wall: posts, testimonies with a verse, prayer requests (anonymous) with an "I prayed" counter, reactions | done (app + database) |
| XP, levels and daily streak (faithBOT's curve) | done on the phone; server XP for prayers |
| Sign in with Apple and email link | done (needs Supabase keys) |
| Database: profiles, friends, follows, blocks, churches, posts, comments, reactions, prayers, highlights, AI cache and limits, XP, reports — all with row-level security and a ranked feed | done, tested |
| Photo upload with moderation, comments screen, follows and friends screens, Krest challenge, subscriptions (RevenueCat), push | next |

Without Supabase keys the app runs in **preview mode** with sample posts, so anyone can try it at once.

## Run it

```bash
npm install
npm run start        # then press i (iOS simulator), a (Android) or w (web), or scan the QR with Expo Go
npm run typecheck
```

## Connect the backend (Supabase)

1. Create a project at supabase.com and copy `.env.example` to `.env` with its URL and anon key.
2. Apply the database: `supabase link --project-ref <ref>` then `supabase db push` (runs `supabase/migrations`).
3. Deploy the AI function and set its secrets:

```bash
supabase functions deploy ai-verse
supabase secrets set AI_PROVIDER=anthropic AI_MODEL=<model id> ANTHROPIC_API_KEY=<key> AI_FREE_DAILY_LIMIT=10
```

4. In Supabase → Authentication → Providers, turn on Apple and Email.

**AI speed settings** (optional secrets): `AI_FAST_MODEL` (toolbar buttons, default the fast Flash-Lite model), `AI_MODEL`
(free questions), `AI_FALLBACK_MODELS`, `AI_HEDGE_MS` (start a parallel try after this long, default 3500),
`AI_FIRST_TOKEN_MS` (streaming: switch model if no words by then, default 4000). Measured: first words in ~2 s,
a full toolbar answer in ~2.5 s, a cached answer in ~1 s.

Test the database rules locally on any empty Postgres 15+: `supabase/tests/run.sh`.
Test the live project end to end (two temporary users post, react and pray, then are deleted): `SB_URL=... SB_PUBLISHABLE=... SB_SECRET=... node supabase/tests/e2e.mjs`.

## Ship to the App Store

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

You need an Apple Developer account ($99 a year). TestFlight first with your own church, then App Review.

## Structure

```
src/app/            screens (Expo Router): (tabs)/index, bible, community, profile; read/[book]/[chapter]; compose; sign-in
src/lib/            bible (books, reading, cache), ai (verse toolbar client), feed, progress (XP, streak), i18n, supabase
src/components/     shared UI
src/theme.ts        the heavenly-blue palette, light and dark
supabase/migrations the database, policies and the ranked feed
supabase/functions  ai-verse (the AI gateway with cache and daily limits)
supabase/tests      a local test of the wall's privacy rules
```

## Stack

Expo (React Native) + TypeScript + Expo Router · Supabase (Postgres, Auth, Storage, Edge Functions) ·
AI behind one server function (provider set by configuration) · later RevenueCat, Mux, PostHog, Sentry.

© 2026 the faithBOOK founders. All rights reserved.
