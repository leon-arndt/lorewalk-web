# Lorewalk Web (PWA)

## IMPORTANT

DO NOT AUTO-COMMIT AND PUSH TO MAIN - WAIT FOR PERMISSION

Always check [TODO.md](TODO.md) at the start of a task to see what's outstanding, and clean it up (remove or check off completed items) after finishing work that addresses one.

A browser-based PWA companion to the Lorewalk Android game. Players can explore the map, view nearby historical POIs, and manage their creature collection and expeditions — without AR. Installable on Android via Chrome's "Add to Home Screen".

The primary Lorewalk game and its design documents live in `../Lorewalk` (Unity/ARCore). This repo shares the same Supabase backend.

## Game Design

All game design decisions — POI system, check-in mechanic, creature system, UI/UX choices, and monetisation — are documented in [GameDesign.md](GameDesign.md). Read it before making changes to game mechanics or UI flows.

### Monetisation costs (reference before pricing changes)

Full pricing/cadence decisions live in GameDesign.md's Monetisation section; the raw cost inputs behind them. All figures in **SGD** (Singapore is the first market — medals are sourced overseas either way, so cost is driven by bulk-import volume into Singapore, not a US-style domestic/international split; approx. USD→SGD 1.35 used where a figure originated in USD):

- **Physical medal (Premium's "monthly event" reward), landed cost at low order volume (bulk-imported, then cheap in-country last-mile since Singapore is compact)**: roughly **SGD 12-20/unit** (die-struck medal SGD 3-11 depending on order size, +SGD 0.70-2.70 engraving, +SGD 0.70-1.35 packaging, +SGD 3-6 local last-mile once landed, +customs/inbound-freight share). Cost per unit drops sharply at 250+ unit bulk import orders, toward **SGD 6-10/unit**, and further at 1,000+.
- **Comparable anchor**: Geocaching Premium is USD $39.99/yr (≈ **SGD 54/yr**, ≈ **SGD 4.50/mo**) or USD $6.99/mo (≈ **SGD 9.50/mo**), digital-only (no physical fulfillment cost). Lorewalk's premium currently prices lower (15 SGD/yr per GameDesign.md) for a smaller, earlier user base with no physical fulfillment built in yet.
- **Why medals are earned, not guaranteed-per-subscriber**: at low subscriber counts, shipping a medal to every premium subscriber every month costs more than a SGD 4.50-9.50/mo subscription covers. Gating the medal behind completing that month's event caps actual unit volume to whoever finishes it, not everyone who pays.
- Real-money payment processing is still deferred (see GameDesign.md's Shop section) — `isPremium` on `PlayerProfile` is currently a **client-side-only, unverified** flag (toggleable via the dev cheats panel) for building out gating logic ahead of an actual payment integration. It must move to a server-verified entitlement (Supabase row + purchase receipt check) before it gates anything of real value.

### Core gameplay loop

One sentence: **walk to real places → collect & hatch creatures → build typed squads → deploy them to boost or claim places → grow your collection and holdings.**

1. **Walk** to a real-world landmark (POI). Steps are tracked as a flavour stat (the HUD step counter); **visits are the real progress currency** — web step counting is too unreliable to gate progression on.
2. **Check in** at the landmark (within 50 m) → earn XP + an egg.
3. **Visit more landmarks** → eggs hatch into **typed** creatures (type = POI category: Heritage/Nature/Arts/…); you gain XP and level up.
4. **Build a squad** (3 squads × 4 slots) from your creatures. Type matters.
5. Keep the **active squad with you** (its creatures are the 3D companions on the map) to boost check-ins by **type affinity**, **or** send it on an **expedition** to a landmark you've visited.
6. **Expeditions** return XP + coins + sometimes an egg, and **claim** that landmark.
7. **Held landmarks** passively earn coins over time; **spend coins** (shop) on slots/cosmetics.

Inspirations and how they map: **Geocaching** (physically visit real places) · **Pikmin Bloom** (companions follow you, timed expeditions, level-gated collection cap) · **Pokémon** (typed creatures, type-vs-place affinity).

Design tensions kept deliberately simple: no combat, no PvP, no losing — claims are solo "collect & hold". See GameDesign.md for the full rationale.

## Tech Stack

- **Framework**: React 19 + TypeScript (Vite)
- **Map**: MapLibre GL JS — OpenFreeMap "Liberty" vector tiles (3D buildings, transit POIs), tilted 45°
- **3D**: three.js — animated creature companions, POI pins, and MRT lines drawn as custom MapLibre layers (`mapCharacters.ts`, `mapPoiPins.ts`, `mapMrt.ts`)
- **Backend**: Supabase JS SDK (`@supabase/supabase-js`) — same Supabase project as the Unity client
- **Native**: Capacitor 7 Android wrapper + `@devmaxime/capacitor-health-connect` for step data; `qrcode` for friend-invite QR
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **PWA**: `vite-plugin-pwa` + Workbox — `registerType: autoUpdate`
- **Routing**: React Router v7 (BrowserRouter)
- **i18n**: hand-rolled `LocaleContext` + per-language dictionaries in `src/i18n/` (en, de, ja, ko, zh, ms, id, ta)
- **Testing**: Playwright e2e (`e2e/`) — see Testing section

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
    mapPoiPins.ts, mapMrt.ts, creaturePreview.ts, mapUtils.ts, health.ts, glass.ts
  data/                   # static game data: creatures.ts, foods.ts, singapore-pois.ts
  i18n/                   # locale dictionaries (en/de/ja/ko/zh/ms/id/ta) + types
  types/
    index.ts               # Shared types: Poi, Creature, Squad, Expedition, PlayerPosition, ...
  pages/                  # MapPage, CreaturesPage, SquadsPage, ExpeditionsPage, ShopPage, ProfilePage
  App.tsx                  # BrowserRouter + Routes + BottomNav + context providers
  main.tsx
  index.css                # Tailwind import + MapLibre CSS + mobile reset
public/
  models/                 # CC0 .glb creature models per POI category (procedural fallback)
e2e/                      # Playwright specs + profile-seed helper
```

## Environment

Copy `.env.example` → `.env.local` and fill in values from your Supabase project settings.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase RPC

`usePois` calls `get_pois_near(p_lat, p_lon, p_radius_m)` — a Postgres function that uses `ST_DWithin` to return nearby POIs as a unified list with a `kind` field (`'permanent'` | `'temporary'`). This RPC needs to exist in the Supabase project shared with the Unity client.

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

## Map

- **Tile source**: OpenFreeMap "Liberty" vector style (`https://tiles.openfreemap.org/styles/liberty`) — free, no API key, includes 3D building extrusions and transit POIs. Community-funded with no SLA: self-host the tiles or use a paid provider before any high-volume public launch. (Previously flat raster OSM; the web map no longer matches the Unity client's 2D look — this was a deliberate aesthetic choice.)
- **3D / pitch**: map initialises at `pitch: 45` so Liberty's building extrusions read as depth; `maxPitch: 70`.
- **Default centre**: Singapore (1.3521, 103.8198) when GPS is unavailable.
- **POI colours**: gold `#f59e0b` = permanent, purple `#a855f7` = temporary — same convention as the Unity uGUI markers.

## PWA Notes

- `registerType: autoUpdate` — service worker updates silently on next load.
- `viewport-fit=cover` + `pb-safe` class on BottomNav handles iOS notch/home bar insets.
- HTTPS required for both Geolocation API and PWA installation. Use `vite --host` + a tunnel (e.g. ngrok) for on-device testing before deploying.

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

Playwright e2e only (no unit runner). Specs in `e2e/lorewalk.spec.ts`, Chromium project, config in `playwright.config.ts` (baseURL `localhost:8849`, `webServer` auto-runs `npm run dev` and reuses a running one).

- `e2e/profile-seed.ts` seeds a known profile into localStorage so tests start from a fixed state. Its `ACHIEVEMENT_IDS` list is hand-mirrored from `profile.ts` — keep it in sync when adding achievements.
- Covers: map render + nav routing, egg hatching, pantry/feed, dev cheats, squad management, expedition dispatch, shrine system.
- Run before committing gameplay changes: `npm run test:e2e`.

## Code Style

Follows the same conventions as the Unity project:
- PascalCase for components, types, and files; camelCase for variables and hooks
- No comments unless the WHY is non-obvious
- No `#region` blocks; no barrel `index.ts` re-exports unless genuinely needed
- Tailwind utility classes preferred over custom CSS; only reach for custom CSS when Tailwind can't express it
- Never use em dashes (—) in UI-facing strings; use a period, colon, or hyphen instead
