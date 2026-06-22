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
- **Tile source**: OpenFreeMap "Liberty" vector tiles (free, no key) — 3D buildings, transit POIs, tilted 45° for depth. Community-funded; self-host or use a paid provider for high-volume production.

---

## Creature System (implemented in PWA)

### Core loop
1. **Check in at a POI** → receive an egg tied to that POI's category.
2. **Visit more landmarks** → each check-in advances all incubating eggs.
3. **Egg hatches** when it reaches its visit requirement → creature added to your collection.
4. **Toast notification** appears on the map when a creature hatches.

### Egg slots
- Default **3 egg slots** (all incubate simultaneously).
- A new egg is awarded on each check-in, as long as a slot is free.
- If all 3 slots are full, the new check-in still advances existing eggs but no new egg is awarded.

### Egg tiers and visit requirements
| Tier | Visits to hatch | Categories |
|---|---|---|
| Common | 5 | Heritage, Landmark, Arts |
| Rare | 8 | Religious, Museum, Nature |

### Creatures by category
| Category | Species | Emoji | Tier |
|---|---|---|---|
| Heritage | Stonewarden | 🗿 | Common |
| Landmark | Pathfinder | 🧭 | Common |
| Arts | Muse | 🎨 | Common |
| Religious | Luminary | 🌟 | Rare |
| Museum | Archivist | 📜 | Rare |
| Nature | Fernspark | 🌿 | Rare |
| Unknown | Wanderer | ✨ | Common |

### Design rationale
Pikmin Bloom uses steps (pedometer) to grow seedlings — web has no reliable step counter. We use **POI visits as the progress currency** instead. This fits the exploration theme better: visiting places is always the core action.

### Future creature features
- **Bonding XP**: visiting more POIs with a creature equipped levels up bond.
- **Evolution**: bond level unlocks new visual forms.
- **Expeditions**: send creatures on timed away missions for extra rewards.
- **Storage cap**: limit collection size to create curation decisions.
- **Duplicate handling**: same species collected twice could merge bond XP.

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

## Player Profile

### Guest profile (offline)
Stored in `localStorage` (`lorewalk_profile`). Auto-created on first launch with the name "Explorer". Name is editable in-app. No sign-in required.

### Level system
- XP is earned per POI check-in: equal to `poi.points` (5–10 XP each).
- XP to reach the next level = `currentLevel × 100`. (Level 1→2: 100 XP, Level 2→3: 200 XP, etc.)
- XP resets within the level on level-up; `totalXp` is cumulative and never resets.

### Daily streak
- Increments when the player checks in on consecutive calendar days.
- Resets to 1 if a day is skipped.
- Stored as `streakDays` + `lastVisitDate` on the profile.

### Achievements
Unlocked automatically when conditions are met during a check-in. Current set:

| ID | Name | Condition |
|---|---|---|
| first_step | First Step | 1 landmark visited |
| explorer | Explorer | 5 visited |
| history_buff | History Buff | 10 visited |
| wanderer | Wanderer | 25 visited |
| legend | Legend of Singapore | 50 visited |
| complete | Complete Explorer | All 100 visited |
| nature_lover | Nature Lover | 5 nature sites |
| heritage_hunter | Heritage Hunter | 10 heritage sites |
| devout | Devout | 5 religious sites |
| museum_goer | Museum Goer | 3 museums |
| streak_3 | On a Roll | 3-day streak |
| streak_7 | Week Warrior | 7-day streak |
| level_5 | Rising Explorer | Reach level 5 |
| level_10 | Seasoned Explorer | Reach level 10 |

### Visit history
Each check-in appends a `VisitRecord` (poiId, poiName, category, visitedAt ISO timestamp, xpEarned). Displayed as a chronological feed on the profile page.

---

## What's Missing vs Pikmin Bloom (to build later)

| Feature | Priority | Notes |
|---|---|---|
| Memory cards | High | Postcard-style keepsake per visited landmark — emotional hook |
| Category completion | High | "Visited 8/35 heritage sites" — the collect-them-all motivation |
| Push notifications | Medium | Expedition returns, daily streak reminder |
| Friends / social feed | Medium | See where friends have explored |
| Weekly challenges | Medium | "Visit 3 new landmarks this week" |
| Step counting | Low | Web can't do this reliably; check-ins are our equivalent |
| Events calendar | Low | Tied to temporary POIs and Singapore public holidays |

---

## Squad System

### Concept
Players assemble **squads** — small teams built from creatures they have already hatched — and station them on the map. A squad's value comes from **type affinity**: when its members' types match the kind of place the player visits, the squad amplifies the rewards from that check-in. There is **no combat** — squads never fight, and a player can never "lose" one. The decision the system creates is *"which team fits where I'm exploring today?"*

### Characters = creatures
A squad slot holds one of the player's existing `HatchedCreature`s. A creature's **type is its `poiCategory`** (Heritage, Landmark, Arts, Religious, Museum, Nature). No separate character entity or type table is introduced — the 6 categories that already drive eggs and creatures *are* the type system.

### Structure
- **3 squads**, each with **4 slots** (12 slots total).
- A creature may occupy **at most one slot across all squads** — assigning it elsewhere moves it.
- Slots may be left empty.
- One squad is the **active squad** (the equipped party). Only the active squad's affinity applies to check-ins.

### Affinity, and the home/away tradeoff
A squad's value is type affinity, but it can only be in one of two states at a time:

- **Home (active):** the active squad boosts the player's *live* check-ins. On a check-in at a POI of category `C`, count active-squad members whose type equals `C` → `m` (0–4); the check-in's XP is multiplied by **`1 + 0.25 × m`** (a full 4-of-a-kind squad doubles XP). Non-matching members give no penalty.
- **Away (on expedition):** the squad is sent to a place and earns an idle reward over time — but while away it gives **no live check-in boost**, even if it's the active squad.

This is the core decision the system creates: *keep the squad home to amplify my own walking, or send it away for hands-off rewards?*

### Expeditions (the "away" loop)
- A squad is sent to a **visited POI** (the map already knows its coordinates). The expedition stores `startedAt` / `returnsAt`.
- **Duration scales with distance** from the player's current position to the target (Singapore centre as fallback when GPS is off). `expeditionDurationMs = BASE (20s) + 8s/km`, capped at 6 min. DEV-tuned so nearby trips finish in ~half a minute; raise for production (idle reward over hours). The picker shows each destination's distance and ETA up front.
- **Reward on collect (all scaled by affinity** to the *target's* category, so a Heritage-heavy squad sent to a Heritage site pays more):
  - **XP** — `EXPEDITION_BASE_XP` (25) × affinity.
  - **Coins** — `(10 + random 0–10)` × affinity. Coins are a soft currency (`profile.coins`); the coin shop in monetisation will spend them.
  - **Egg** — `EXPEDITION_EGG_CHANCE` (40%) to also return an egg of the target's category, but **only if an egg slot is free**.
- **Lifecycle:** *Send* → live countdown → **Collect** (awards the rewards, squad returns home) once returned, or **Recall** early for nothing. Roster editing is locked while away.
- The expedition is **not** combat and cannot fail.

### Squad vs. Expedition
A **squad** is the team (a noun); an **expedition** is what a squad *does* (a verb). They are the same entities in two states — the squad you build is the thing you send. This is why the old standalone "Expeditions" tab was replaced by **Squads**: expeditions are now driven from the squad, not from lone creatures.

### Squads on the map
- A squad that's on an expedition shows a marker at the target POI: a 2×2 cluster of its member emojis.
- The **active** squad's marker gets an indigo ring; a **returned** expedition shows a 🎁 badge.
- Tapping a squad marker opens the Squads tab.

### Persistence
Squads live on `PlayerProfile` in `localStorage` alongside creatures. Three empty squads are created on first load. Older saved profiles without a `squads` field are migrated to three empty squads (same defensive pattern as `eggs`/`maxEggSlots`). `VisitRecord` now also stores `lat`/`lon` so visited POIs can be used as expedition targets.

### Monetisation hook
Default 3 squads / 4 slots. Extra squads or slots are a natural **coin-shop** item, consistent with the existing "extra planter/expedition slots" line — never pay-to-win, since affinity only amplifies the rewards the player already earns by walking.

### Phasing
- **Phase 1 (done, 2D):** squad data model, builder UI, active-squad affinity on check-in, the expedition home/away loop (send → countdown → collect/recall), and expedition markers on the map. Emoji/2D presentation only.
- **Phase 2 (later):** 3D character viewer — a single Quaternius `.glb` rendered in an isolated `<canvas>` on the squad/creature detail screen (Three.js). Assets are CC0; lazy-loaded and excluded from the PWA precache.
- **Phase 3 (later, gated on a Phase 2 perf check):** 3D squad models on the map itself via deck.gl `ScenegraphLayer`. Only if it benchmarks acceptably on a mid-range Android.

---

## Future PWA Features (not yet designed)

- Auth (Supabase) — sync visited POIs, creatures, and points across devices.
- Points → creature growth loop connected to check-ins.
- Push notifications for expedition returns and daily discovery POIs.
- Share a visited POI card (social).
- Leaderboard by POIs visited / points earned.
