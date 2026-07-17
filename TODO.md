## WIP
- favicon — being updated in a separate chat, do not touch
- postcards — Pikmin Bloom-style keepsake per visited POI. Types + context methods (`sendPostcard`, `openPostcard`, `seedMockPostcard`) and `PostcardsSection` component scaffolded; full UI flow and journal integration not built yet.

## Backlog
- premium: pick a medal supplier and get a real quote (see CLAUDE.md cost breakdown), then finalize Premium price point. Candidates worth quoting (low MOQ fits the monthly-changing-design model better than 100+ MOQ local SG suppliers): Medal Foundry (10-25pc runs), Made by Cooper (MOQ 50), EverLighten (no MOQ).
- premium: wire real payment (Google Play Billing, per the existing coin-shop deferral note) and move `isPremium` to a server-verified Supabase entitlement.
- premium: design + build the monthly event (progress tracking, completion claim, generate a claimable QR code for in-person pickup at the meetup instead of shipping-address capture).
- premium: set up the recurring monthly Meetup listing for the Singapore community event (5k walk + free drinks + QR-code medal pickup).
