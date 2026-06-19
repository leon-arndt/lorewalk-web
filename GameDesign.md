# Lorewalk — Game Design Document

This document records all game design decisions for the Lorewalk PWA. Keep it updated as the design evolves. The Unity/Android game design lives in the parent project's CLAUDE.md.

---

## POI System

### Two modes
- **Offline mode** — all 100 seeded Singapore POIs are shown on the map immediately, no GPS needed. Designed for local development and testing.
- **Online mode** — POIs are fetched from Supabase via the `get_pois_near` RPC using the player's real GPS position (1km radius).

### POI types
- **Permanent POIs** — fixed historical and cultural landmarks. Gold/orange marker ring (🏛).
- **Temporary POIs** — time-bounded event POIs with an expiry. Purple marker ring (✨).

### Marker visual states
| State | Appearance |
|---|---|
| Default | Coloured ring + category icon |
| Hovered | Scaled up (1.2×) + name tooltip above |
| Visited | Green ring + 😊 emoji |

---

## Check-in Mechanic

Inspired by geocaching. Players check in at POIs to mark them as visited and earn points.

### Offline mode
- "Check in" button is always available in the POI detail panel.
- No GPS proximity required — useful for testing and for players who want to log visits retroactively.
- Visited state is persisted in `localStorage` (`lorewalk_visited_pois`).

### Online mode
- Check-in is only available when the player's GPS position is within **50 metres** of the POI.
- The detail panel shows the current distance and updates as the player moves.
- Beyond 50m: "Get within 50m to check in (currently Xm away)" message.
- Visited state will eventually sync to Supabase per-player (not yet implemented).

### Post-check-in
- Marker immediately updates to 😊 / green ring — no page reload.
- Detail panel shows "😊 You visited this place!" confirmation state.
- Points awarded (future: feed into creature planter slots).

---

## Map

- **Default zoom**: 14 (wider view to show more POIs at once).
- **Default centre**: Singapore (1.3521, 103.8198) when GPS is unavailable.
- **Player marker**: Indigo dot with a soft halo ring.
- **Tile source**: OSM raster tiles (dev only — switch to self-hosted or commercial for production).

---

## Creature System (from Unity game — to be ported to PWA)

- **Planter slots**: Points from POI visits grow creature seedlings. Multiple slots allow parallel growth.
- **Plucking**: Grown creatures are "plucked" from the ground (AR on Android; TBD for web).
- **Bonding**: Continued play strengthens bond, unlocking evolutions or new behaviours.
- **Decorating**: Cosmetic items earned through play or the coin shop.
- **Expedition slots**: Send creatures on timed away missions for rewards.
- **Storage cap**: Limits how many creatures can be held at once.

---

## UI / UX Decisions

- **Theme**: White background, pastel accents. No dark mode for now.
- **Primary accent**: Indigo `#6366f1`.
- **Bottom navigation**: 4 tabs — Map, Creatures, Expeditions, Profile.
- **POI detail**: Slide-up white panel from bottom with drag handle. Shows name, description, category badge, points badge, distance (online), learn-more link, and check-in button.
- **Mode toggle**: Frosted-glass pill in the top-left of the map. Green dot = online, grey dot = offline.

---

## Monetisation (from Unity game — applies to PWA too)

- **Free tier**: Limited POI set, starter creatures only, basic evolution.
- **Premium (15 SGD/year)**: All POIs, unlimited creatures, full evolution tree, exclusive landmark creatures.
- **Coin shop (IAP)**: Cosmetics, extra planter/expedition slots, convenience items. Never pay-to-win.

---

## Future PWA Features (not yet designed)

- Auth (Supabase) — sync visited POIs, creatures, and points across devices.
- Points → creature growth loop connected to check-ins.
- Push notifications for expedition returns and daily discovery POIs.
- Share a visited POI card (social).
- Leaderboard by POIs visited / points earned.
