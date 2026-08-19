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
- **Real-money payment**: the integration has scaffolding but does not run yet. GameDesign.md's "Premium entitlement" section and the TODO.md WIP entry list the exact setup steps that remain. The design routes Google Play Billing through RevenueCat's Capacitor SDK. A Supabase-side `premium_entitlements` table becomes the server-verified source of truth once the app is online, and only a RevenueCat webhook (`supabase/functions/revenuecat-webhook`) writes to it. Until that webhook is deployed and Play Console products exist, `isPremium` on `PlayerProfile` falls back to a **client-side, unverified** flag. The dev cheats panel toggles that flag, and so does the offline test-purchase flow in `PremiumModal.tsx`. Do not treat the flag as trustworthy for anything of real value until the Supabase row backs it in online mode.

### Core gameplay loop

One sentence: **walk to real places, collect and hatch creatures, build typed squads, deploy them to boost or claim places, and grow your collection and holdings.**

1. **Walk** to a real landmark (a POI). The HUD step counter tracks steps as a flavour stat. **Visits carry the real progress.** Web step counting is too unreliable to gate progression on.
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
- **Native**: a Capacitor 7 Android wrapper. `@devmaxime/capacitor-health-connect` reads step data. `qrcode` renders the friend-invite QR. `@revenuecat/purchases-capacitor` handles Play Billing for Premium subscriptions (see `src/lib/billing.ts`)
- **Styling**: Tailwind CSS v4, through `@tailwindcss/vite`
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
    RewardContext.tsx      # queued reward/level-up screens
    ConnectionModeContext, LocaleContext, MusicContext
  hooks/
    useGeolocation.ts      # watchPosition wrapper → PlayerPosition state
    usePois.ts             # Supabase RPC → nearby Poi[] (re-fetches on ~50m movement)
    useVisitedPois, useStepCounter, useFriends, useBackgroundMusic
  lib/
    supabase.ts            # Supabase client (env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    profile.ts             # profile persistence + game rules (achievements, XP, eggs)
    journalDb.ts           # IndexedDB store for journal photos / postcards
    mapCharacters.ts       # three.js creature companions (loads /models/creature-<cat>.glb)
    mapPlayerAvatar.ts     # procedural on-map player avatar (PlayerAppearance colours)
    mapPoiPins.ts, mapMrt.ts, creaturePreview.ts, mapUtils.ts, health.ts, sfx.ts
    theme.ts, glass.ts     # theme.ts = brand accent/reward colours, glass.ts = frosted surfaces
  data/                   # static game data: creatures.ts, foods.ts, cosmetics.ts,
                          #   medals.ts, singapore-pois.ts
  i18n/                   # locale dictionaries (en/de/ja/ko/zh/ms/id/ta) + types
  types/
    index.ts               # Shared types: Poi, Creature, Squad, Expedition, PlayerPosition, ...
  pages/                  # MapPage, CreaturesPage, SquadsPage, ShopPage, ProfilePage,
                          #   SettingsPage, CharacterCustomizationPage
                          # ExpeditionsPage.tsx still exists but has no route and no import
  App.tsx                  # BrowserRouter + Routes + BottomNav + context providers
  main.tsx
  index.css                # Tailwind import + MapLibre CSS + mobile reset
public/
  models/                 # CC0 .glb creature models per POI category (procedural fallback)
e2e/                      # Playwright specs + profile-seed helper
```

## Environment

Copy `.env.example` to `.env.local`. Fill in the values from your Supabase project settings.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

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

None of these tables check `auth.uid()`. Like the rest of this pre-launch prototype, they trust a client-generated `player_id` at face value, so RLS stays open instead of owner-scoped.

```sql
create table if not exists player_public_stats (
  player_id text primary key,
  display_name text not null,
  level int not null default 1,
  total_steps bigint not null default 0,
  achievement_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table player_public_stats enable row level security;
create policy "public read" on player_public_stats for select using (true);
create policy "anyone can upsert" on player_public_stats for insert with check (true);
create policy "anyone can update" on player_public_stats for update using (true);
```

## Map

- **Tile source**: the OpenFreeMap "Liberty" vector style at `https://tiles.openfreemap.org/styles/liberty`. It is free, needs no API key, and includes 3D building extrusions and transit POIs. The community funds it and it carries no SLA. Self-host the tiles or move to a paid provider before any high-volume public launch. The map used flat raster OSM before. The web map no longer matches the 2D look of the Unity client, which was a deliberate aesthetic choice.
- **3D and pitch**: the map starts at `pitch: 70`, so Liberty's building extrusions read as depth. `maxPitch` is 80. The first GPS fix eases the camera to zoom 16.5, because the extrusions start at zoom 12 and the tilt reads as flat above that.
- **Default centre**: Singapore (1.3521, 103.8198), used when the browser has no GPS fix.
- **POI colours**: gold `#f59e0b` marks a permanent POI, purple `#a855f7` marks a temporary one. The Unity uGUI markers follow the same convention.

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

Playwright end-to-end is the only test runner. There is no unit runner. The specs live in `e2e/lorewalk.spec.ts` and run in the Chromium project. `playwright.config.ts` sets the baseURL to `localhost:8849`, and its `webServer` block runs `npm run dev` or reuses a running one.

- `e2e/profile-seed.ts` seeds a known profile into localStorage, so every test starts from a fixed state. Its `ACHIEVEMENT_IDS` list mirrors `profile.ts` by hand. Update it whenever you add an achievement.
- The suite covers the map render and nav routing, egg hatching, the pantry and feeding, dev cheats, squad management, expedition dispatch, and the shrine system.
- Run `npm run test:e2e` before you commit a gameplay change.

## Code Style

The web code follows the same conventions as the Unity project:
- PascalCase for components, types, and files. camelCase for variables and hooks.
- No comments unless the WHY is non-obvious.
- No `#region` blocks. No barrel `index.ts` re-exports unless one is genuinely needed.
- Prefer Tailwind utility classes over custom CSS. Reach for custom CSS only when Tailwind cannot express the rule.
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
