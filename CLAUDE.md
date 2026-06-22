# Lorewalk Web (PWA)

A browser-based PWA companion to the Lorewalk Android game. Players can explore the map, view nearby historical POIs, and manage their creature collection and expeditions — without AR. Installable on Android via Chrome's "Add to Home Screen".

The primary Lorewalk game and its design documents live in `../Lorewalk` (Unity/ARCore). This repo shares the same Supabase backend.

## Game Design

All game design decisions — POI system, check-in mechanic, creature system, UI/UX choices, and monetisation — are documented in [GameDesign.md](GameDesign.md). Read it before making changes to game mechanics or UI flows.

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
- **Backend**: Supabase JS SDK (`@supabase/supabase-js`) — same Supabase project as the Unity client
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **PWA**: `vite-plugin-pwa` + Workbox — `registerType: autoUpdate`
- **Routing**: React Router v7 (BrowserRouter)

## Project Structure

```
src/
  components/
    Map/
      MapView.tsx          # MapLibre map, player dot, POI markers
    UI/
      BottomNav.tsx        # 5-tab bottom navigation (Map/Creatures/Squads/Shop/Profile)
      PoiDetailPanel.tsx   # Slide-up panel shown when a POI marker is tapped
  hooks/
    useGeolocation.ts      # watchPosition wrapper → PlayerPosition state
    usePois.ts             # Supabase RPC → nearby Poi[] (re-fetches on ~50m movement)
  lib/
    supabase.ts            # Supabase client (env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
    mapUtils.ts            # haversineDistance (matches LocationService.cs logic)
  types/
    index.ts               # Shared types: Poi, Creature, PlanterSlot, Expedition, PlayerPosition
  pages/
    MapPage.tsx            # Main screen: map + GPS status + POI detail panel
    CreaturesPage.tsx      # Creature collection (stub)
    ExpeditionsPage.tsx    # Expedition slots (stub)
    ProfilePage.tsx        # Player stats (stub)
  App.tsx                  # BrowserRouter + Routes + BottomNav
  main.tsx
  index.css                # Tailwind import + MapLibre CSS + mobile reset
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
npm run build     # production build → dist/
npm run preview   # preview production build locally
```

## Code Style

Follows the same conventions as the Unity project:
- PascalCase for components, types, and files; camelCase for variables and hooks
- No comments unless the WHY is non-obvious
- No `#region` blocks; no barrel `index.ts` re-exports unless genuinely needed
- Tailwind utility classes preferred over custom CSS; only reach for custom CSS when Tailwind can't express it
