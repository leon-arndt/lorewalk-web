## WIP
- favicon — being updated in a separate chat, do not touch
- postcards — Pikmin Bloom-style keepsake per visited POI. Types + context methods (`sendPostcard`, `openPostcard`, `seedMockPostcard`) and `PostcardsSection` component scaffolded; send flow now has a paper-plane send animation (`PoiDetailPanel.tsx`, `postcardPlaneOut` keyframe in `index.css`). Journal integration still not built.

## Backlog
- premium: pick a medal supplier and get a real quote (see CLAUDE.md cost breakdown), then finalize Premium price point. Candidates worth quoting (low MOQ fits the monthly-changing-design model better than 100+ MOQ local SG suppliers): Medal Foundry (10-25pc runs), Made by Cooper (MOQ 50), EverLighten (no MOQ).
- premium: wire real payment (Google Play Billing, per the existing coin-shop deferral note) and move `isPremium` to a server-verified Supabase entitlement.
- premium: design + build the monthly event (progress tracking, completion claim, generate a claimable QR code for in-person pickup at the meetup instead of shipping-address capture).
- premium: set up the recurring monthly Meetup listing for the Singapore community event (5k walk + free drinks + QR-code medal pickup).
- player customization: swap the procedural avatar for a real CC0 rig. Manually download Quaternius Universal Base Characters + Modular Character Outfits (itch.io, name-your-own-price) or Kenney Modular Characters, export with `Skin`/`Hair`/`Eyes` materials and `Top_`/`Bottom_`/`Shoes_`/`Head_`-prefixed nodes matching `src/data/cosmetics.ts` ids, drop in as `public/models/player-avatar.glb` - see `public/models/README.md`. No code changes needed once the file exists.
