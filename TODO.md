## WIP

- **favicon**: another chat updates this. Do not touch it.
- **news**: an in-app News overlay, opened from a button on the map HUD (bottom right, mirrors the weekly walk button). `NewsOverlay.tsx` renders the list and the post detail. `useNews.ts` reads the `news_posts` table when online and falls back to `src/data/news.ts` when offline, the same way `usePois` falls back to `singapore-pois.ts`. Post title and body are per-locale `jsonb`, with an English fallback. Nobody has applied the migration (`supabase/migrations/20260817000000_news_posts.sql`) or authored a real post yet. The public website that reads the same table is a separate, later job.
- **postcards**: a Pikmin Bloom-style keepsake per visited POI. The types and the context methods (`sendPostcard`, `openPostcard`, `seedMockPostcard`) exist, and so does the `PostcardsSection` component. The send flow plays a paper-plane animation (`PoiDetailPanel.tsx`, plus the `postcardPlaneOut` keyframe in `index.css`). Journal integration remains unbuilt.
- **premium payment**: the client and the server both have scaffolding, but the flow is not live.
  - Client: `src/lib/billing.ts` wraps RevenueCat's `@revenuecat/purchases-capacitor` SDK. `PremiumModal.tsx` calls it when the app runs native and online.
  - Server: `supabase/functions/revenuecat-webhook` writes the `premium_entitlements` table from `supabase/migrations/20260721000000_premium_entitlements.sql`. `ProfileContext.tsx` reconciles `isPremium` against that row once online.
  - Remaining steps, in order:
    1. Create a Google Play Console app for `com.lorewalk.app` with the `lorewalk_premium_monthly` and `lorewalk_premium_yearly` subscription products.
    2. Create a RevenueCat project, link it to Play Console, and add a `premium` entitlement with Monthly and Annual packages on the default offering. Set its public API key as `VITE_REVENUECAT_ANDROID_KEY`.
    3. Apply the migration, then run `supabase functions deploy revenuecat-webhook` with `REVENUECAT_WEBHOOK_SECRET` set. Enter the same secret value in the RevenueCat webhook config.
    4. Ship at least an internal-testing Play Console release, then test a real purchase on a device. Play Billing does not work in a plain browser tab.
  - The coin packs in `ShopPage.tsx` are a separate purchase flow. Nobody has wired them yet.

## Backlog

- **premium**: pick a medal supplier and get a real quote. The CLAUDE.md cost breakdown holds the current estimates. Finalize the Premium price point after the quote arrives. A low minimum order quantity fits the monthly design change better than the 100-plus MOQ of local Singapore suppliers, so quote these first: Medal Foundry (runs of 10 to 25), Made by Cooper (MOQ 50), EverLighten (no MOQ).
- **premium**: design and build the monthly event. It needs progress tracking, a completion claim, and a claimable QR code for in-person pickup at the meetup. It does not need a shipping address.
- **premium**: set up the recurring monthly Meetup listing for the Singapore community event: 5k walk, free drinks, QR-code medal pickup.
- **player customization**: replace the procedural avatar with a real CC0 rig. Download Quaternius Universal Base Characters and Modular Character Outfits (itch.io, name-your-own-price), or Kenney Modular Characters. Export with `Skin`, `Hair`, and `Eyes` materials, and with `Top_`, `Bottom_`, `Shoes_`, and `Head_` node prefixes that match the ids in `src/data/cosmetics.ts`. Save the result as `public/models/player-avatar.glb`. See `public/models/README.md`. The code needs no change once the file exists.
- **icons**: the food, shrine, squad, and claim markers have no model of their own, so they fall back to the generic hashed-color placeholder cube in `creaturePreview.ts` (`getPlaceholderPreviewURL`, reached through `EmojiSprite` and the `spriteEl()` helper in `MapView.tsx`). A slightly rotated box reads as a missing icon. Source real CC0 low-poly models per marker type from Quaternius (quaternius.com) or Poly Pizza (poly.pizza, filtered by license). Wire them into `creaturePreview.ts` the same way `getCreaturePreviewURL` and `getEggPreviewURL` already handle creatures and eggs.
