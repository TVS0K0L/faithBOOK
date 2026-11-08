# faithBOOK plan (summary)

The full plan — market, product, roadmap, business model, go-to-market, architecture, data model, AI layer,
trust and safety, legal, team, fundraising, projections, risks and the next 90 days — is a shared document:
https://claude.ai/artifact/A1p1HnmfF1vjbpXnja2xZ8

Decisions that shape this code:

1. **One codebase** (Expo / React Native) for iOS, Android and Huawei; iOS ships first.
2. **Supabase** for the backend; every table has row-level security; the feed is ranked in the database.
3. **The app never holds AI keys.** All AI goes through `supabase/functions/ai-verse`, with a shared cache
   (the same verse is answered once) and a daily limit for free users.
4. **Public-domain Bibles first** (WEB, Russian Synodal); licensed translations later through API.Bible.
5. **Safety before scale:** report and block from day one; photos moderated before they are public;
   dating only in Phase 3, 18+, verified.
6. **Phase gates:** Phase 2 starts only when 30-day retention is above 25% with 5,000 users.
