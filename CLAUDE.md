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

All figures use **SGD**. Singapore is the first market. Lorewalk sources medals overseas in either case, so bulk-import volume into Singapore drives the cost, not a US-style split between domestic and international shipping. Where a figure started in USD, the conversion uses about 1.35 SGD to the USD.

- **Physical medal (the reward for Premium's monthly event)**: a player picks the medal up in person at the monthly Singapore community meetup. Lorewalk does not mail medals, so no per-recipient shipping or customs cost applies. A medal lands at the event venue at roughly **SGD 4 to 15 per unit**:
  - SGD 3 to 11 for the die-struck medal, depending on order size
  - SGD 0.70 to 2.70 for engraving
  - SGD 0.70 to 1.35 for packaging
  - a small shared freight and customs cost for the single bulk shipment into Singapore

  Unit cost drops sharply at 250 units per bulk import order. It drops again at 1,000.
- **Event costs (these replace per-recipient shipping)**: a monthly booking for the venue and the walk route, plus a free-drinks budget sized to the expected attendance. GameDesign.md's "Monthly medal event" section holds the full structure: a community 5k walk, then free drinks, then QR-code medal pickup, in the parkrun style.
- **Candidate venue: Temasek Shophouse (Orchard Road) or a similar site.** It is a social-impact hub next to Fort Canning Park. A walk loop through heritage and nature POIs ends back at the venue for drinks and medal pickup. Its event spaces hold about 80 to 220 guests, depending on the room. The tradeoff: the venue curates for social and community impact, such as ground-ups, non-profits, and social enterprises. A booking therefore needs a pitch on the community-walk angle, not a plain commercial rental. The venue does not guarantee free or subsidized use to a for-profit premium product, even when the event itself serves the community. Nobody has booked it yet. It remains a candidate.
- **Comparable anchors**: Geocaching Premium costs USD 39.99 per year, about **SGD 54 per year** or **SGD 4.50 per month**. Its monthly plan costs USD 6.99, about **SGD 9.50 per month**. Geocaching Premium is digital only and carries no physical fulfillment cost, so it anchors the price. **parkrun** anchors the structure of the event itself: free, recurring, volunteer-run community walks where a player claims a tracked achievement in person instead of by mail. Lorewalk Premium currently prices below both anchors, at SGD 15 per year per GameDesign.md. The user base is smaller and earlier, and no physical fulfillment exists yet.
- **Why a player earns the medal instead of receiving one per subscription**: at low subscriber counts, one medal per subscriber per month costs more than a SGD 4.50 to 9.50 monthly subscription covers. A completion gate caps the real unit volume at whoever finishes that month's event, not at everyone who pays.
- **Real-money payment**: the integration has scaffolding but does not run yet. GameDesign.md's "Premium entitlement" section and the TODO.md WIP entry list the exact setup steps that remain. The design routes Google Play Billing through RevenueCat's Capacitor SDK. A Supabase-side `premium_entitlements` table becomes the server-verified source of truth once the app is online, and only a RevenueCat webhook (`supabase/functions/revenuecat-webhook`) writes to it. Until that webhook is deployed and Play Console products exist, `isPremium` on `PlayerProfile` falls back to a **client-side, unverified** flag. The dev cheats panel toggles that flag, and so does the offline test-purchase flow in `PremiumModal.tsx`. Both exist only in a dev build (`import.meta.env.DEV`): a shipped build never grants Premium or coins without a real purchase. Do not treat the flag as trustworthy for anything of real value until the Supabase row backs it in online mode.

### Core gameplay loop

One sentence: **walk to real places, collect and hatch creatures, build typed squads, deploy them to boost or claim places, and grow your collection and holdings.**

1. **Walk** to a real landmark (a POI). The app counts steps from GPS on every tab. A stretch faster than 15 km/h is a bike or a vehicle and counts no steps (`MAX_WALK_SPEED_MS` in `useStepCounter.ts`). Steps hatch eggs and count toward the monthly Premium medal.
2. **Check in** at the landmark, within 50 m. The player earns XP and an egg.
3. **Visit more landmarks.** Eggs hatch into **typed** creatures, where the type matches the POI category: Heritage, Nature, Arts, and so on. The player gains XP and levels up.
4. **Build a squad** from the collection. There are 3 squads of 4 slots each. Type matters.
5. **Keep the active squad with you.** Its creatures walk the map as 3D companions and boost check-ins through **type affinity**. As the alternative, send the squad on an **expedition** to a landmark the player has visited.
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
- **Styling**: Tailwind CSS v4, through `@tailwindcss/vite`
- **Animation**: `motion` (the new name of Framer Motion). Import from `motion/react`. `src/lib/motion.ts` holds the shared springs and presets: `sheetIn`, `panelMotion`, `backdropIn`, `popIn`. Use them for a new sheet or panel. Do not animate the opacity of an element that holds a glass surface, because the blur stops while the opacity is below 1. Animate the transform or the color instead
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
    UI/                    # panels, HUD, overlays (BottomNav, PoiDetailPanel,
                           #   ShrinePanel, JournalOverlay, PostcardsSection,
                           #   HatchRewardScreen, LevelUpScreen, WeekStrip, etc)
  contexts/               # React context providers
    ProfileContext.tsx     # player profile: creatures, squads, coins, eggs, steps
    RewardContext.tsx      # reward screen (real payouts) + toast (small updates)
    PlayerLocationContext  # one GPS watch + step counter for the app, applies steps to eggs
    ConnectionModeContext, LocaleContext, MusicContext
  hooks/
    useGeolocation.ts      # watchPosition wrapper → PlayerPosition state
    usePois.ts             # Supabase RPC → nearby Poi[] (re-fetches on ~50m movement)
    useAccount.ts          # the signed-in Supabase account: anonymous or Google
    useVisitedPois, useStepCounter, useFriends, useBackgroundMusic
  lib/
    supabase.ts            # Supabase client (env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    profile.ts             # profile persistence + game rules (achievements, XP, eggs)
    cloudSave.ts           # cloud save: sync rules + the engine that uploads and downloads
    googleAuth.ts          # Google sign-in: web button, native sheet, Supabase link
    journalDb.ts           # IndexedDB store for journal photos / postcards
    mapCharacters.ts       # three.js creature companions (loads /models/creature-<cat>.glb)
    playerAvatar.ts        # chibi player avatar: /models/avatar-*.glb, tints + item add-ons
    mapPlayerAvatar.ts     # map layer that walks the player avatar at the GPS position
    mapPoiPins.ts, mapMrt.ts, creaturePreview.ts, mapUtils.ts, health.ts, sfx.ts
    vfx.ts, mapVfx.ts      # particle effects: simulation + the MapLibre layer that draws them
    theme.ts, glass.ts     # theme.ts = brand accent/reward colours, glass.ts = frosted surfaces
  dev/                    # dev-only pages, never built: vfxPreview.html (the Particle Editor preview)
  data/                   # static game data: creatures.ts, foods.ts, cosmetics.ts,
                          #   medals.ts, singapore-pois.ts
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
  vfx/
    vfxbank.json          # particle effects by id, read at runtime by lib/vfx.ts
  sounds/
    soundbank.json        # event -> sample map, read at runtime by lib/sfx.ts
    packs/<pack-id>/      # sample files + pack.json (name, author, license)
e2e/                      # Playwright specs + profile-seed helper
tools/
  vscode-soundbank/       # VSCode extension: the sound event editor
  vscode-particles/       # VSCode extension: the particle effect editor
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
- **`medal_claims`**: the `claim_medal` RPC issues one pickup code per player per month, and only for an active entitlement. Only the service role can call `redeem_medal`. A player reads only their own claims.
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

## Map

- **Tile source**: the OpenFreeMap "Liberty" vector style at `https://tiles.openfreemap.org/styles/liberty`. It is free, needs no API key, and includes 3D building extrusions and transit POIs. The community funds it and it carries no SLA. Self-host the tiles or move to a paid provider before any high-volume public launch. The map used flat raster OSM before. The web map no longer matches the 2D look of the Unity client, which was a deliberate aesthetic choice.
- **3D and pitch**: the map starts at `pitch: 70`, so Liberty's building extrusions read as depth. `maxPitch` is 80. The first GPS fix eases the camera to zoom 16.5, because the extrusions start at zoom 12 and the tilt reads as flat above that.
- **Camera follow**: the camera follows the player until the player pans, zooms, or turns the map by hand. It then stays in place. When the player is far from the middle of the screen, a recenter button shows below the compass. `followingRef` in `MapView.tsx` holds the state.
- **Avatar behind buildings**: the avatar shares the depth buffer with the 3D buildings. `mapPlayerAvatar.ts` draws the hidden parts as a green silhouette, so the player can always see where they stand.
- **Default centre**: Singapore (1.3521, 103.8198), used when the browser has no GPS fix.
- **Singapore-only labels**: the game is Singapore only, so the map shows no base-map label outside Singapore, such as Johor Bahru or Batam. On load, `MapView.tsx` adds a `within` filter to every Liberty symbol layer. The filter uses the boundary polygon in `src/data/singapore-boundary.ts`. The polygon includes the territorial waters, so it follows the maritime line through the Johor Strait.
- **POI colours**: gold `#f59e0b` marks a permanent POI, purple `#a855f7` marks a temporary one. The Unity uGUI markers follow the same convention.

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
Settings still controls it, because the bus selects the slider.

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
- **Clouds and rain**: `mapWeather.ts` draws one fixed cloud field over the island as a three.js layer, with a shadow below each cloud. The clouds sit at 750 m, above the street-level camera, so they show only after a zoom out. The rain is a 2D canvas above the map canvas.
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
```

## Testing

Playwright end-to-end is the only test runner. There is no unit runner. The specs live in `e2e/` and run in the Chromium project. `e2e/lorewalk.spec.ts` holds the gameplay specs. `playwright.config.ts` sets the baseURL to `localhost:8849`, and its `webServer` block runs `npm run dev` or reuses a running one.

- `e2e/profile-seed.ts` seeds a known profile into localStorage, so every test starts from a fixed state. Its `ACHIEVEMENT_IDS` list mirrors `profile.ts` by hand. Update it whenever you add an achievement.
- The suite covers the map render and nav routing, egg hatching, the pantry and feeding, dev cheats, squad management, expedition dispatch, and the shrine system.
- `e2e/cloud-save.spec.ts` covers the cloud save. It seeds a signed-in session and answers every Supabase request itself, so it needs no project and no Google account. It does not cover the Google sign-in itself.
- Run `npm run test:e2e` before you commit a gameplay change.

## Code Style

The web code follows the same conventions as the Unity project:
- PascalCase for components, types, and files. camelCase for variables and hooks.
- No comments unless the WHY is non-obvious.
- No `#region` blocks. No barrel `index.ts` re-exports unless one is genuinely needed.
- Prefer Tailwind utility classes over custom CSS. Reach for custom CSS only when Tailwind cannot express the rule.
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
