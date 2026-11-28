# Lorewalk Web (PWA)

## IMPORTANT

DO NOT AUTO-COMMIT AND PUSH TO MAIN. WAIT FOR PERMISSION.

Check [TODO.md](TODO.md) at the start of every task. It lists what is outstanding. After you finish work that addresses an item, remove the item or check it off.

### Multi-agent workflow

TODO.md has two sections. **WIP** holds work in progress across agents and chats. **Backlog** holds work that nobody has started.

- When you start a Backlog item, move it to WIP at once. Add one line that says what exists and where to look.
- When you finish an item and commit it, delete it from WIP.
- When you pick up a WIP item, run `git log --oneline -10` first. Read what already landed before you write code.

Lorewalk Web is a browser-based PWA companion to the Lorewalk Android game. Players explore the map, view nearby historical POIs, and manage their creature collection and expeditions. The web app has no AR. Chrome installs it on Android through "Add to Home Screen".

The main Lorewalk game and its design documents live in `../Lorewalk` (Unity and ARCore). This repo shares the same Supabase backend.

## Documentation style

The Markdown docs in this repo follow ASD-STE100 Simplified Technical English, in STE-flavored mode. The rules and the checker live in [.claude/skills/ste-writing/](.claude/skills/ste-writing/). Invoke the `ste-writing` skill before you write or edit a doc, then check the result:

```bash
python3 .claude/skills/ste-writing/ste-lint.py README.md CLAUDE.md GameDesign.md TODO.md
```

Keep each file under about 2.0 violations per 100 words and at 0 em dashes. The checker is a heuristic, not a certified STE checker, so read its hits before you act on them.

## Game Design

[GameDesign.md](GameDesign.md) documents every game design decision: the POI system, the check-in mechanic, the creature system, the UI and UX choices, and the monetisation. Read it before you change a game mechanic or a UI flow.

### Monetisation costs (read before you change pricing)

GameDesign.md's Monetisation section holds the pricing and cadence decisions. This section holds the raw cost inputs behind them.

All figures use **SGD**. Singapore is the first market. Lorewalk sources tokens overseas in either case, so bulk-import volume into Singapore drives the cost, not a US-style split between domestic and international shipping. Where a figure started in USD, the conversion uses about 1.35 SGD to the USD.

- **Physical Step Token (the reward for the Monthly Step Goal)**: a player earns a token after 1, 3, 6, and 12 goal months, then every 6 months. GameDesign.md's "Step Tokens" section holds the rules. The token is a die-cast challenge coin with two sides, and a player picks it up in person at the monthly Community Walk in Singapore. Lorewalk does not mail tokens, so no per-recipient shipping or customs cost applies. The figures below come from supplier pages in 2026-11, not from a quote:
  - Gift Market (Singapore): a coin of 1.5 to 2.0 inch and 3 mm, minimum 30, about 5 weeks. The page shows about SGD 13.50 for each coin at 30 pieces, and about SGD 1.70 at 500 pieces.
  - Gumtoo (Singapore): minimum 100 for each design, about 3 weeks, quote only.
  - Neither page gives the mould fee, the sample fee, or the price of a serial number. A design with two sides needs two dies.

  The Monthly Step Goal pays only if a token lands at about SGD 3 or less. A player gets four tokens in the first year, against about SGD 51 of income after the 15 percent fee of Google Play.
- **Event costs (these replace per-recipient shipping)**: a monthly booking for the venue and the walk route, plus a free-drinks budget sized to the expected attendance. GameDesign.md's "Community Walk" section holds the full structure: a community 5k walk, then free drinks, then QR-code token pickup, in the parkrun style.
- **Candidate venue: Temasek Shophouse (Orchard Road) or a similar site.** It is a social-impact hub next to Fort Canning Park. A walk loop through heritage and nature POIs ends back at the venue for drinks and token pickup. Its event spaces hold about 80 to 220 guests, depending on the room. The tradeoff: the venue curates for social and community impact, such as ground-ups, non-profits, and social enterprises. A booking therefore needs a pitch on the community-walk angle, not a plain commercial rental. The venue does not guarantee free or subsidized use to a for-profit premium product, even when the event itself serves the community. Nobody has booked it yet. It remains a candidate.
- **Comparable anchors**: Geocaching Premium costs USD 39.99 per year, about **SGD 54 per year** or **SGD 4.50 per month**. Its monthly plan costs USD 6.99, about **SGD 9.50 per month**. Geocaching Premium is digital only and carries no physical fulfillment cost, so it anchors the price. **parkrun** anchors the structure of the event itself: free, recurring, volunteer-run community walks where a player claims a tracked achievement in person instead of by mail. Lorewalk Premium currently prices below both anchors, at SGD 15 per year per GameDesign.md. The user base is smaller and earlier, and no physical fulfillment exists yet.
- **Why a player earns the token instead of receiving one per subscription**: at low subscriber counts, one token per subscriber per month costs more than a SGD 4.50 to 9.50 monthly subscription covers. The ladder caps the volume at four tokens in the first year and two in each later year. Only a month with Premium counts, so each token has paid months behind it. A token carries no year, so one bulk order of a design serves every player.
- **Real-money payment**: the integration has scaffolding but does not run yet. GameDesign.md's "Premium entitlement" section and the TODO.md WIP entry list the exact setup steps that remain. The design routes Google Play Billing through RevenueCat's Capacitor SDK. A Supabase-side `premium_entitlements` table becomes the server-verified source of truth once the app is online, and only a RevenueCat webhook (`supabase/functions/revenuecat-webhook`) writes to it. Until that webhook is deployed and Play Console products exist, `isPremium` on `PlayerProfile` falls back to a **client-side, unverified** flag. The dev cheats panel toggles that flag, and so does the offline test-purchase flow in `PremiumModal.tsx`. Both exist only in a dev build (`import.meta.env.DEV`): a shipped build never grants Premium or coins without a real purchase. Do not treat the flag as trustworthy for anything of real value until the Supabase row backs it in online mode.

### Core gameplay loop

One sentence: **walk to real places, collect and hatch creatures, build typed squads, deploy them to boost or claim places, and grow your collection and holdings.**

1. **Walk** to a real landmark (a POI). The app counts steps from GPS on every tab. A stretch faster than 15 km/h is a bike or a vehicle and counts no steps (`MAX_WALK_SPEED_MS` in `useStepCounter.ts`). On Android, the app can read the phone's own step count instead. See the Steps section. Steps hatch eggs and count toward the Monthly Step Goal, which earns a physical Step Token.
2. **Check in** at the landmark, within 50 m. The player earns XP and an egg. Smaller places fill the map between the landmarks: heritage markers and local spots give less XP, and an egg only now and then. Food at hawker centres, daily finds, and a trail of the week give a reason to walk the same streets again.
3. **Visit more landmarks.** Eggs hatch into **typed** creatures, where the type matches the POI category: Heritage, Nature, Arts, and so on. The player gains XP and levels up.
4. **Build a squad** from the collection. There are 3 squads of 4 slots each. Type matters.
5. **Keep the active squad with you.** Its creatures walk the map as 3D companions and boost check-ins through **type affinity**. As the alternative, send the squad on an **expedition** to a landmark the player has visited. The creatures then walk there and back on the map.
6. **Expeditions** return XP and coins, sometimes an egg, and they **claim** the landmark.
7. **Held landmarks** earn coins over time. The player **spends coins** in the shop on slots and cosmetics.

Three games inspire the loop. **Geocaching** gives the trip to a real place. **Pikmin Bloom** gives the companions that follow the player, the timed expeditions, and the level-gated collection cap. **Pokemon** gives the typed creatures and the affinity between a type and a place.

The design keeps its tensions simple on purpose. There is no combat, no PvP, and no way to lose. A claim is a solo "collect and hold". GameDesign.md holds the full rationale.

## Tech Stack

- **Framework**: React 19 and TypeScript on Vite
- **Map**: MapLibre GL JS with OpenFreeMap "Liberty" vector tiles (3D buildings, transit POIs), tilted 70 degrees
- **3D**: three.js. Custom MapLibre layers draw the animated creature companions, the POI pins, and the MRT lines (`mapCharacters.ts`, `mapPoiPins.ts`, `mapMrt.ts`)
- **Backend**: Supabase JS SDK (`@supabase/supabase-js`), against the same Supabase project as the Unity client
- **Native**: a Capacitor 7 Android wrapper. `@devmaxime/capacitor-health-connect` reads step data. `qrcode` renders the friend-invite QR. `@revenuecat/purchases-capacitor` handles Play Billing for Premium subscriptions (see `src/lib/billing.ts`). `@capgo/capacitor-social-login` opens the native Google sign-in sheet (see `src/lib/googleAuth.ts`)
- **Styling**: Tailwind CSS v4, through `@tailwindcss/vite`. The app has a field journal look. `src/lib/theme.ts` holds the palette, `src/lib/paper.ts` holds the paper surfaces, the tape, and the corner size, and `src/components/UI/Journal.tsx` holds the building blocks (`PageHeader`, `SectionTitle`, `NoteCard`, `Stamp`, `Postmark`, `InkButton`, `Mono`, `Chip`, `BackButton`, `CloseButton`). `src/components/UI/Icons.tsx` holds the line icons (`Icon`) and the type sticker (`CategoryBadge`). Fredoka is the main font and DM Mono is the typewriter font, both from `@fontsource`. GameDesign.md's "UI and UX Decisions" section holds the rules
- **Animation**: `motion` (the new name of Framer Motion). Import from `motion/react`. `src/lib/motion.ts` holds the shared springs and presets: `sheetIn`, `panelMotion`, `backdropIn`, `popIn`. Use them for a new sheet or panel. `src/lib/ripple.ts` gives every button a press squish and a Material-style ripple from one listener in `App.tsx`. Add `data-no-ripple` to a button that must not show them
- **PWA**: `vite-plugin-pwa` and Workbox, with `registerType: autoUpdate`
- **Routing**: React Router v7 (BrowserRouter)
- **i18n**: a hand-rolled `LocaleContext` plus one dictionary per language in `src/i18n/` (en, de, ja, ko, zh, ms, id, ta)
- **Testing**: Playwright end-to-end only, in `e2e/`. See the Testing section

## Project Structure

```
src/
  components/
    Map/
      MapView.tsx          # MapLibre map, player dot, 3D creature/POI/MRT layers
    UI/                    # Journal.tsx = shared building blocks of the look
                           # panels, HUD, overlays (BottomNav, PoiDetailPanel,
                           #   ShrinePanel, JournalOverlay, PostcardsSection,
                           #   HatchRewardScreen, LevelUpScreen, WeekStrip, etc)
  contexts/               # React context providers
    ProfileContext.tsx     # player profile: creatures, squads, coins, eggs, steps
    RewardContext.tsx      # reward screen (real payouts) + toast (small updates)
    PlayerLocationContext  # one GPS watch + step counter for the app, applies steps to eggs
    ConnectionModeContext, LocaleContext, MusicContext
  hooks/
    useGeolocation.ts      # watchPosition wrapper → PlayerPosition state
    usePois.ts             # landmarks (Supabase RPC or the bundled list) + the imported places
    usePlaces.ts           # loads public/pois/sg-places.json through lib/places.ts
    useAccount.ts          # the signed-in Supabase account: anonymous or Google
    useVisitedPois, useStepCounter, useFriends, useBackgroundMusic
  lib/
    supabase.ts            # Supabase client (env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    profile.ts             # profile persistence + game rules (achievements, XP, eggs)
    nextGoal.ts            # picks the "next stop" bar on the map: a ready reward, or the nearest landmark
    places.ts              # imported places: POI tiers, pins near the camera, daily finds, trail of the week
    stepTokens.ts          # Monthly Step Goal and Step Tokens: goal months, the ladder, one token each month
    cloudSave.ts           # cloud save: sync rules + the engine that uploads and downloads
    googleAuth.ts          # Google sign-in: web button, native sheet, Supabase link
    journalDb.ts           # IndexedDB store for journal photos / postcards
    mapCharacters.ts       # three.js creature companions (loads /models/creature-<cat>.glb)
    playerAvatar.ts        # chibi player avatar: /models/avatar-*.glb, tints + item add-ons
    mapPlayerAvatar.ts     # map layer that walks the player avatar at the GPS position
    mapPoiPins.ts, mapMrt.ts, creaturePreview.ts, mapUtils.ts, health.ts, sfx.ts
    vfx.ts, mapVfx.ts      # particle effects: simulation + the MapLibre layer that draws them
    theme.ts, paper.ts     # theme.ts = the field journal palette, paper.ts = the paper surfaces
  dev/                    # dev-only pages, never built: vfxPreview.html (the Particle Editor preview)
  data/                   # static game data: creatures.ts, foods.ts, cosmetics.ts,
                          #   singapore-pois.ts
  i18n/                   # locale dictionaries (en/de/ja/ko/zh/ms/id/ta) + types
  types/
    index.ts               # Shared types: Poi, Creature, Squad, Expedition, PlayerPosition, ...
  pages/                  # MapPage, CreaturesPage, SquadsPage, ShopPage, ProfilePage,
                          #   SettingsPage, CharacterCustomizationPage
                          # ExpeditionsPage.tsx still exists but has no route and no import
                          # ShopPage has no route: CoinCapsule opens it as a bottom sheet
  App.tsx                  # BrowserRouter + Routes + BottomNav + context providers
  main.tsx
  index.css                # Tailwind import + MapLibre CSS + mobile reset
public/
  models/                 # CC0 .glb creature models per POI category (procedural fallback)
  pois/
    sg-places.json        # markers, spots, food spots, and find anchors, built by tools/poi-import
  vfx/
    vfxbank.json          # particle effects by id, read at runtime by lib/vfx.ts
  sounds/
    soundbank.json        # event -> sample map, read at runtime by lib/sfx.ts
    packs/<pack-id>/      # sample files + pack.json (name, author, license)
e2e/                      # Playwright specs + profile-seed helper
tools/
  vscode-soundbank/       # VSCode extension: the sound event editor
  vscode-particles/       # VSCode extension: the particle effect editor
  poi-import/             # Python script that builds public/pois/sg-places.json from open data
```

## Environment

Copy `.env.example` to `.env.local`. Fill in the values from your Supabase project settings.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` is optional. Without it the app hides Google sign-in, and the cloud save stays off.

## Supabase RPC

`usePois` calls `get_pois_near(p_lat, p_lon, p_radius_m)`. This Postgres function uses `ST_DWithin` and returns nearby POIs as one list. Each row carries a `kind` field, either `'permanent'` or `'temporary'`. The function must exist in the Supabase project that the Unity client shares.

Example signature:
```sql
create or replace function get_pois_near(p_lat float8, p_lon float8, p_radius_m float8)
returns setof json language sql stable as $$
  select json_build_object(
    'id', id, 'name', name, 'description', description,
    'latitude', ST_Y(geom::geometry), 'longitude', ST_X(geom::geometry),
    'kind', 'permanent', 'premium_only', premium_only,
    'creature_reward_id', creature_reward_id
  ) from permanent_pois
  where ST_DWithin(geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_radius_m)
  union all
  select json_build_object(
    'id', id, 'name', name, 'description', description,
    'latitude', ST_Y(geom::geometry), 'longitude', ST_X(geom::geometry),
    'kind', 'temporary', 'active_until', active_until,
    'creature_reward_id', creature_reward_id
  ) from temporary_pois
  where ST_DWithin(geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_radius_m)
    and now() between active_from and active_until;
$$;
```

`useFriends` needs three more tables. `friend_codes` and `friendships` support code-based friend adding. `player_public_stats` holds what a friend's profile card shows: level, total steps, and unlocked achievement ids.

### Auth and row-level security

The anon key ships in the client bundle, so anyone can call the Supabase REST API with it. Row-level security (RLS) is the only access control. Read `supabase/migrations/20261115000000_auth_rls.sql` before you add a table or a policy.

- **Player id**: when the app goes online, `ensureSession()` in `src/lib/supabase.ts` signs the player in with Supabase anonymous auth. `useAccount` follows the session, and `ProfileContext.tsx` sets `profile.id` to its auth uid. The server reads the uid from a signed token as `auth.uid()`, and every policy compares a row against it. An offline profile keeps a local `guest_<timestamp>` id until then.
- **Google sign-in**: an anonymous session lives on one device. `signInWithGoogleToken()` in `src/lib/googleAuth.ts` first links Google to the anonymous account, so the uid and every row that keys on it stay. If the Google account already owns a Lorewalk account, it signs in to that account, and `profile.id` changes to its uid.
- **Dashboard settings**: three settings must be on in the Supabase project (Authentication, Sign In / Providers). Without "Allow anonymous sign-ins" no client gets a session, and every policy denies access. Google sign-in needs the Google provider, with the web client id under "Client IDs", and "Allow manual linking".
- **`premium_entitlements`**: a player reads only their own row. Only the RevenueCat webhook writes.
- **`friend_codes`**: a player reads and writes only their own codes.
- **`friendships`**: a player reads only their own rows. The `add_friend_by_code` RPC is the only way to write a row.
- **`player_public_stats`**: a player writes only their own row. A player reads their own row and the rows of their friends.
- **`medal_claims`**: a table from the monthly medal that the app had before 2026-11-28. The `claim_medal` and `redeem_medal` functions belong to it. Nothing calls them. A player reads only their own claims.
- **`step_goal_months`**: one row for each month in which a player walked the Monthly Step Goal with Premium. The `record_step_goal` RPC is the only way to write a row. It needs an active entitlement, and it takes this month, or the month before it in its first 7 days. The client reports the goal, because the server cannot see steps. A player reads only their own rows.
- **`step_token_claims`**: the `claim_step_token` RPC issues the pickup code of a Step Token, and only for an active entitlement. It allows the next token of the ladder only, it needs that many rows in `step_goal_months`, and it allows one token per player per month. Only the service role can call `redeem_step_token`. A player reads only their own claims. `supabase/migrations/20261128000000_step_tokens.sql` holds both tables.
- **`coin_grants`**: one row for each verified coin pack purchase. Only the RevenueCat webhook writes, and a player reads only their own rows. `syncCoinGrants()` in `ProfileContext.tsx` adds each new row to `profile.coins` and records its id in `profile.coinGrantsApplied`. The table makes sure that a paid pack arrives one time. The coin balance itself stays client data.
- **`player_saves`**: a player reads only their own row. The `save_profile` RPC is the only way to write a row, and it refuses an anonymous account.
- **Account deletion**: the `delete_account` RPC deletes every row of the caller in the tables above, then the auth user. `deleteAccount()` in `ProfileContext.tsx` calls it, wipes the profile and the journal photos on the device, and reloads the app as a new guest. A new table that keys on the player id needs a `delete` line in that function. The function does not cancel a Play subscription.

A new table must enable RLS in its migration and add its policy there. The `ensure_rls` event trigger (`supabase/migrations/20261124020000_rls_auto_enable.sql`) also turns RLS on for every new table in `public`, so a table that a raw SQL statement makes is not open to the anon key. RLS without a policy denies every client, so a table with no policy returns no rows.

The server does not verify gameplay values. Steps, level, and achievements in `player_public_stats` come from the client as reported. The profile in `player_saves` is client data too.

## Cloud save

A player who signs in with Google gets a cloud save. `localStorage` stays the working copy, so the game still runs without a connection. The cloud save is the full `PlayerProfile` as one JSON row in `player_saves`, with a `revision` number. `supabase/migrations/20261124000000_player_saves.sql` holds the table and the `save_profile` RPC.

- **Engine**: `CloudSaveEngine` in `src/lib/cloudSave.ts` runs outside React. `ProfileContext.tsx` makes one, tells it the account and each profile change, and takes a downloaded profile back through `onAdopt`.
- **Device state**: the `lorewalk.cloudSave` key in `localStorage` holds the account id, the last revision that the device saw, and a `dirty` flag for a change that is not in the cloud yet.
- **Upload**: a change uploads 2 seconds later, and at most one time in 30 seconds. The app also uploads when it goes to the background. `save_profile` takes the revision that the device last saw. If the server holds a different one, it writes nothing and reports a conflict.
- **Download**: the app compares revisions when the account appears, when the app comes back to the foreground, and when the network comes back. `decideSync()` holds the rule. A device without a change of its own takes a newer cloud save. A device with no progress takes the cloud save on the first sign-in.
- **Conflict**: when both sides hold progress, `CloudConflictDialog.tsx` asks the player which save to keep. The engine does not merge profiles.
- **Housekeeping**: some profile changes come from the app, not the player: spawned food and shrine nodes, the account id, and the server entitlement. `persistHousekeeping()` marks them, and they do not set `dirty`. Without that mark, a device that only opened the app raises a false conflict against a newer cloud save. Use `persistHousekeeping()` for a new automatic change.
- **New profile field**: add its default to `normalizeProfile()` in `profile.ts`. A cloud save from an older build goes through the same function as a local save.
- **Steps**: the step counter counts one device. `profile.dailySteps` holds the sum across devices, and the `lorewalk.stepsApplied` key holds how many steps of this device are already in that sum.
- **Not synced**: the journal photos in IndexedDB, and the settings outside the profile, such as the volume and the language.

## Steps

The step count has two sources. `PlayerLocationContext.tsx` takes the higher one, so no step counts two times.

- **GPS**: `useStepCounter.ts` estimates steps from GPS distance while the app is open. A leg runs from an anchor fix to the first fix that clears the accuracy of both fixes. A phone reports about one fix each second, and a walker moves 1.4 m in that time. A leg between two neighbor fixes therefore never clears the floor, so do not measure from the previous fix.
- **Vehicle**: a fix above 15 km/h starts the leg again and counts nothing. The speed comes from the phone. If the phone gives none, the hook uses the fixes of the last 20 seconds.
- **Health Connect**: on Android, `src/lib/health.ts` reads the steps that the phone records, also while the app is closed. The app reads them when it opens, when it comes back to the foreground, and one time each minute. No code runs in the background.
- **Plugin load**: do not return a Capacitor plugin from an `async` function. The plugin answers every property, `then` included, so the promise never settles. `health.ts` takes the plugin out of the module at each call.
- **Opt-in**: the "Count steps with Health Connect" switch in Settings turns the source on and shows the permission prompt. The switch shows only in the Android app, and only when Health Connect is available. The `lorewalk.healthSteps` key in `localStorage` holds the choice.
- **Past days**: Health Connect also gives the last 7 days. `applyTodaySteps()` in `ProfileContext.tsx` raises a past day to the phone's count and gives the difference to the eggs.
- **Manifest**: `android/app/src/main/AndroidManifest.xml` holds the `READ_STEPS` permission and the two permission rationale entries. Without them, Health Connect does not show the prompt. The Health Connect library needs Android 8 or higher, so `minSdkVersion` in `android/variables.gradle` is 26.

## Places

The 117 curated landmarks live in `src/data/singapore-pois.ts`. Every other place comes from `public/pois/sg-places.json`: about 1,480 heritage markers, 1,340 local spots, 640 food spots, and 6,400 anchors for the daily finds. GameDesign.md's "POI tiers" and "Daily Activities" sections hold the game rules.

- **Landmark positions**: a landmark stands at a point that a player can reach, because a check-in needs 50 m. For a park or a reservoir, that is an entrance or a path, not the centroid. For the Istana, it is the main gate. `supabase/seed.sql` holds the same 117 rows, so change both files. Then build the places file again, because the import merges by position.
- **Build**: run `python3 tools/poi-import/build_places.py` from the repo root. It needs only the Python standard library. It downloads from data.gov.sg, Wikidata, and the Overpass API of OpenStreetMap, and keeps the downloads in `tools/poi-import/cache/`. Add `--refresh` to download again. Do not hand-edit the JSON file: change a filter in the script instead.
- **Load**: `loadPlaces()` in `src/lib/places.ts` fetches the file one time. `usePlaces` gives it to React. If the file does not load, the game runs with the landmarks only and tries again 30 seconds later. The file is in the PWA precache.
- **Ids**: a place id comes from its source, such as `nhb-hs-<slug>`, `wd-Q<number>`, or `osm-n<number>`. The visit history keys on the id, so do not change how the script makes it.
- **Tier**: `Poi.tier` is `landmark`, `marker`, or `spot`. A POI without a tier is a landmark. `poiTier()` reads it.
- **Pins**: `MapPage.tsx` gives `MapView` only the pins from `poisInView()`. The check-in rule and the next stop bar still use the full list.
- **Same for every player**: the daily finds, the food of the day, and the trail of the week come from `hash()` of the date, not from `Math.random()`. Keep it that way, so two players at one place see the same things.
- **One save for each GPS fix**: `MapPage.tsx` checks in or picks up a find, never both in one fix, and the food sync waits one task. Each of them saves the full profile from its own snapshot, so two saves in one fix lose the first one.
- **Licenses**: the file carries data under the Singapore Open Data Licence, CC0 (Wikidata), and the ODbL (OpenStreetMap). The ODbL applies to the file as a whole. The panel shows the publisher of each place.

## Map

- **Tile source**: the OpenFreeMap "Liberty" vector style at `https://tiles.openfreemap.org/styles/liberty`. It is free, needs no API key, and includes 3D building extrusions and transit POIs. The community funds it and it carries no SLA. Self-host the tiles or move to a paid provider before any high-volume public launch. The map used flat raster OSM before. The web map no longer matches the 2D look of the Unity client, which was a deliberate aesthetic choice.
- **3D and pitch**: the map starts at `pitch: 70`, so Liberty's building extrusions read as depth. `maxPitch` is 80. The first GPS fix eases the camera to zoom 16.5, because the extrusions start at zoom 12 and the tilt reads as flat above that.
- **Camera follow**: the camera follows the player until the player pans, zooms, or turns the map by hand. It then stays in place. When the player is far from the middle of the screen, a recenter button shows below the compass. `followingRef` in `MapView.tsx` holds the state.
- **Frame rate**: the 3D layers animate without end, so each one asks for the next frame. They must call `requestMapFrame(map)` from `mapUtils.ts`, not `map.triggerRepaint()`. It holds the map at 30 frames a second while nothing moves. A gesture and a camera ease still draw at the full rate. Without this limit the map draws on each display refresh, and a phone gets warm. Use `map.triggerRepaint()` only for one frame after a change, such as a new model. The particle effects keep the full rate, because an effect is short.
- **Pixel ratio**: the map draws at 2 device pixels for each CSS pixel at most (`MAX_PIXEL_RATIO` in `MapView.tsx`). A phone with a ratio of 3 then fills less than half of the pixels.
- **Camera deadband**: the camera does not follow a GPS move below 1 m (`CAMERA_DEADBAND_M`). A phone that stands still reports small moves, and each camera ease draws half a second at the full rate.
- **Trips**: a creature on the way to a food node, a shrine, or an expedition landmark walks there and back as a 3D character. `MapPage.tsx` builds a `TripSpec` for each trip, the companion layer in `mapCharacters.ts` moves the creatures, and `MapView.tsx` draws the dashed `trip-routes` line. `tripProgress()` gives the leg of a trip from the clock, so a trip holds no state of its own. GameDesign.md's "Trips on the map" section holds the rules.
- **Avatar behind buildings**: the avatar shares the depth buffer with the 3D buildings. `mapPlayerAvatar.ts` draws the hidden parts as a green silhouette, so the player can always see where they stand.
- **Default centre**: Singapore (1.3521, 103.8198), used when the browser has no GPS fix.
- **Singapore-only labels**: the game is Singapore only, so the map shows no base-map label outside Singapore, such as Johor Bahru or Batam. On load, `MapView.tsx` adds a `within` filter to every Liberty symbol layer. The filter uses the boundary polygon in `src/data/singapore-boundary.ts`. The polygon includes the territorial waters, so it follows the maritime line through the Johor Strait.
- **Parchment**: `mapAmbience.ts` moves each colour of the Liberty style onto a sepia ramp (`parchment()`), then applies the day, night, and weather tint. Labels are ink on paper by day.
- **POI colours**: gold `#f59e0b` marks a permanent POI, purple `#a855f7` marks a temporary one. The Unity uGUI markers follow the same convention.
- **DOM markers**: the squad, claim, food, shrine, and find markers are DOM elements. MapLibre places a marker with a transform on its element, and the press squish of `ripple.ts` scales the pressed button. A scale on the marker element moves the marker away from the finger, and the tap then lands on the map. Build each marker with `markerShell()` in `MapView.tsx`: the marker element is a shell, and the button is its child. `syncMarkers()` keeps a marker that did not change, so a profile change does not replace a marker under the finger.

## Sound

`src/lib/sfx.ts` plays every UI sound. It holds no file path and no tuning value
of its own. It fetches `public/sounds/soundbank.json` and plays an event by id,
such as `ui/click`. A per-event record holds the candidate samples with a weight,
the gain, a min and max playback rate, the lowpass cutoff, a retrigger cooldown,
and a voice cap. If the fetch fails, a small fallback bank in the file keeps the
two original UI sounds alive.

The background music is an event too. `music/town-theme` carries `bus: "music"`
and `loop: true`. `useBackgroundMusic` reads the track and the gain from the same
bank, then streams the file through an audio element. The music volume slider in
Settings still controls it, because the bus selects the slider. The music stops
while the app or the tab is in the background: the hook follows the
`visibilitychange` event.

One delegated click handler in `App.tsx` covers the whole app. An element with
`data-sfx="close"` gets `ui/close`. A `data-sfx` value with a slash names a full
event id.

A sound pack is a directory below `public/sounds/packs/`. It holds every sample,
the music included, and a `pack.json` with the name, the author, and the license. Only CC0 assets go
in, as with the models.

Edit the bank with the VSCode extension in `tools/vscode-soundbank/`. Press F5
and run "Lorewalk: Open Soundbank Editor". Do not hand-edit an event value if the
editor can set it. See `tools/vscode-soundbank/README.md`.

## Visual effects

`src/lib/vfx.ts` simulates the particle effects, such as fireworks, sparkles, and
confetti. Like the sound bank, it holds no effect of its own. It fetches
`public/vfx/vfxbank.json` and plays an effect by id, such as `fx/fireworks`.
An effect is a list of emitters. An emitter can burst a second emitter where
each particle dies, or leave a trail of a second emitter. A firework uses both.

`src/lib/mapVfx.ts` draws the effects as a MapLibre custom layer. Call
`playMapVfx(id, [lng, lat])` to play an effect on the map. Effects scale with
zoom like the companions. One unit is 1 m at zoom 20, and the player avatar is
5.6 units tall.

Edit the bank with the Particle Editor, a VSCode extension in
`tools/vscode-particles/`. Run "Lorewalk: Open Particle Editor". Its preview
shows `src/dev/vfxPreview.html` from the dev server, so `npm run dev` must run.
That page plays the effect with the game's own code on the game's map. See
`tools/vscode-particles/README.md`.

The map is light, so additive blending washes out there. Use normal blending
for a color that must show in daylight.

## Day, night, and weather

The map follows the Singapore clock and the real weather. `src/lib/ambience.ts` holds the state as four values from 0 to 1: `night`, `awake`, `cloud`, and `rain`.

- **Day and night**: `mapAmbience.ts` reads each color of the Liberty style once, then writes a tinted copy back. Dusk runs from about 18:35 to 19:50, and dawn from about 06:10 to 07:20. The hours are fixed, because sunrise and sunset in Singapore move by only about 15 minutes in a year.
- **Lit windows**: at night, a generated window image covers the walls of the 3D buildings through `fill-extrusion-pattern`. The `awake` value sets the share of lit windows. It decreases between 22:30 and midnight. The pattern also covers the roof, so a thin `building-3d-roof` layer caps each building.
- **Weather data**: `weather.ts` reads two public data.gov.sg endpoints every 5 minutes. They need no key. The rainfall endpoint gives a 5-minute total for each rain gauge, and the nearest gauge sets `rain`. The two-hour forecast for the nearest town sets `cloud`.
- **Clouds and rain**: `mapWeather.ts` draws one fixed cloud field over the island as a three.js layer, with a shadow below each cloud. The clouds sit at 750 m. They fade in only on a far zoom out, from zoom 13 to zoom 11.5 (`CLOUDS_GONE_ZOOM` and `CLOUDS_FULL_ZOOM`), so they never cover the POIs. The cloud shadows show at every zoom. The rain is a 2D canvas above the map canvas.
- **Test a state**: in a dev build, run `_ambience({ hour: 21, cloud: 1, rain: 1 })` in the browser console. Run `_ambience(null)` to go back to the real state.

## PWA Notes

- `registerType: autoUpdate` updates the service worker on the next load, without a prompt.
- `viewport-fit=cover` plus the `pb-safe` class on BottomNav handles the iOS notch and home bar insets.
- Both the Geolocation API and PWA install need HTTPS. Before you deploy, test on a device: run `vite --host` and put a tunnel such as ngrok in front of it.

## Dev Commands

```bash
npm run dev       # local dev server (localhost:8849)
npm run build     # tsc -b + production build → dist/
npm run preview   # preview production build locally
npm run lint      # eslint
npm run test:e2e  # Playwright e2e suite (auto-starts dev server)
npm run android   # build + cap sync + open Android Studio
npm run android:apk  # build + cap sync + debug APK, without Android Studio
```

## Android build

- **JDK**: Capacitor 7 needs JDK 21. `android/gradle/gradle-daemon-jvm.properties` tells Gradle to run on JDK 21, so `JAVA_HOME` can point to a different version. Gradle looks for a JDK only in the usual directories. For a JDK in a different directory, add `org.gradle.java.installations.paths=<path>` to `~/.gradle/gradle.properties`.
- **Debug APK**: `npm run android:apk` writes `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a phone with `adb install -r`. A debug build needs no store account and no release key.
- **Server address**: Vite reads `.env.production.local` for a build only. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` there. The APK can then go online, and the dev server and the e2e tests stay without a server. The host holds the same two values in its Production environment.
- **System bars**: the app draws below the status bar and the navigation bar. `PageHeader`, the map HUD, the Settings header, and the level-up screen add `env(safe-area-inset-top)`. A new element at the top of the screen must add it too. `styles.xml` sets dark bar icons, because the pages are light paper.
- **Service worker**: the first start after an install can show the previous build. The service worker serves its cache, then updates. Start the app a second time before you judge a change.
- **Location**: the manifest declares `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`. The WebView asks for both when the map calls `navigator.geolocation`. Android denies a permission that the manifest does not declare.
- **Browser library pin**: `android/build.gradle` forces `androidx.browser` to 1.8.0. The social login plugin asks for 1.9.0 at compile time, and its Google helper brings 1.4.0 at run time. Gradle refuses the mix. Version 1.9.0 needs `compileSdk` 36 and Android Gradle plugin 8.9.1, so remove the pin after that upgrade.

## Testing

Playwright end-to-end is the only test runner. There is no unit runner. The specs live in `e2e/` and run in the Chromium project. `e2e/lorewalk.spec.ts` holds the gameplay specs. `playwright.config.ts` sets the baseURL to `localhost:8849`, and its `webServer` block runs `npm run dev` or reuses a running one.

- `e2e/profile-seed.ts` seeds a known profile into localStorage, so every test starts from a fixed state. Its `ACHIEVEMENT_IDS` list mirrors `profile.ts` by hand. Update it whenever you add an achievement.
- The suite covers the map render and nav routing, egg hatching, the pantry and feeding, dev cheats, squad management, expedition dispatch, and the shrine system.
- `e2e/places.spec.ts` covers the imported places: food nodes at food spots, a daily find, rain finds, a check-in at a marker, and the trail of the week. It sets the sky with `_ambience()`, so it does not depend on the real weather.
- `e2e/ux.spec.ts` covers a press on a food marker, the step count of a walk that arrives as one fix each half second, the tabs of the character designer, and the back button. `e2e/steps-speed.spec.ts` covers the vehicle limit.
- `e2e/trips.spec.ts` covers the dashed line of a trip on each leg, a trip that is home, and the frame limit of the map while nothing moves.
- `e2e/music.spec.ts` covers the music stop in the background.
- `e2e/step-tokens.spec.ts` covers the Monthly Step Goal and the Step Tokens: a month that counts only with Premium, the claim, the limit of one token each month, and the ladder after 12 months. It claims offline in the dev build, so it does not cover the `record_step_goal` and `claim_step_token` RPCs.
- `e2e/cloud-save.spec.ts` covers the cloud save. It seeds a signed-in session and answers every Supabase request itself, so it needs no project and no Google account. It does not cover the Google sign-in itself.
- Run `npm run test:e2e` before you commit a gameplay change.

## Code Style

The web code follows the same conventions as the Unity project:
- PascalCase for components, types, and files. camelCase for variables and hooks.
- No comments unless the WHY is non-obvious.
- No `#region` blocks. No barrel `index.ts` re-exports unless one is genuinely needed.
- Prefer Tailwind utility classes over custom CSS. Reach for custom CSS only when Tailwind cannot express the rule.
- Take a colour from `theme.ts`, a surface from `paper.ts`, and a button, a stamp, or a heading from `Journal.tsx`. Do not add a colour gradient or a soft drop shadow. A blur is only for the controls over the map, through `hudTag` and `vellum()`.
- The app has one close button and one back button: `CloseButton` and `BackButton` from `Journal.tsx`. Do not draw another one. A sheet, a panel, or an overlay gets `CloseButton`. A page that goes to its parent page gets `BackButton`.
- Show a short fact about a thing, such as its type or its distance, as a `Chip` with an `Icon`. Do not use an emoji as an icon in new UI.
- Never open a native browser dialog (`window.confirm`, `alert`, `prompt`) in the game. Use `ConfirmDialog.tsx`, and set `danger` for an action that deletes something.
- Never put an em dash in a UI-facing string. Use a period, a colon, or a hyphen instead. The same rule applies to the Markdown docs, per the Documentation style section.

## Localization

Lorewalk Web ships in 8 languages (`src/i18n/`: en, de, ja, ko, zh, ms, id, ta). No player-facing string may live as a literal in a component. Read the `translate` skill at [.claude/skills/translate/SKILL.md](.claude/skills/translate/SKILL.md) before you add or change UI text. It has the key-naming convention and the per-locale translation steps.

A pre-commit hook blocks a commit that adds hardcoded UI text. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

Run the checker by hand at any time:

```bash
python3 .claude/skills/translate/translate-lint.py         # staged diff only, what the hook runs
python3 .claude/skills/translate/translate-lint.py --all    # every file in scope, for an audit
```

It is a heuristic, not a parser. Read its hits before you act on them.
