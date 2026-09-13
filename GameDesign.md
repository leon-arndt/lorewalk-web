# Lorewalk: Game Design Document

This document records every game design decision for the Lorewalk PWA. Keep it current as the design changes. The design for the Unity and Android game lives in the CLAUDE.md of the parent project.

---

## POI System

### Two modes
- **Offline mode**: the map shows all 100 seeded Singapore POIs at once, with no GPS. This mode serves local development and testing.
- **Online mode**: the `get_pois_near` RPC fetches POIs from Supabase around the real GPS position of the player, within a 1 km radius.

### POI types
- **Permanent POIs**: fixed historical and cultural landmarks. Gold and orange marker ring (🏛).
- **Temporary POIs**: event POIs with an expiry time. Purple marker ring (✨).

### Marker visual states
| State | Appearance |
|---|---|
| Default | Coloured ring + category icon |
| Hovered | Scaled up (1.2×) + name tooltip above |
| Visited | Green ring + 😊 emoji |

---

## Check-in Mechanic

Geocaching inspires this mechanic. A player checks in at a POI to mark it as visited and to earn points.

### Offline mode
- The POI detail panel always shows the "Check in" button.
- The check-in needs no GPS proximity. This helps testing, and it lets a player log a visit after the fact.
- `localStorage` holds the visited state, under the key `lorewalk_visited_pois`.

### Online mode
- The player can check in only within **50 metres** of the POI.
- The detail panel shows the current distance and updates it as the player moves.
- Past 50 m, the panel shows "Get within 50m to check in (currently Xm away)".
- The visited state will sync to Supabase per player later. Nobody has built that yet.

### After the check-in
- The marker turns to a green ring with 😊 at once. The page does not reload.
- The detail panel switches to the confirmation state: "😊 You visited this place!".
- The reward screen shows the XP and, when an egg slot is free, the new egg.
- The player receives points. These points will feed the creature planter slots later.

---

## Map

- **Default zoom**: 14. The wider view fits more POIs on screen.
- **Default centre**: Singapore (1.3521, 103.8198), used when the browser has no GPS fix.
- **Player marker**: an indigo dot with a soft halo ring.
- **Tile source**: OpenFreeMap "Liberty" vector tiles. They are free, need no key, and carry 3D buildings and transit POIs. The map tilts 45 degrees for depth. The community funds the tiles, so self-host them or move to a paid provider for high-volume production.

---

## Creature System (built in the PWA)

### Core loop
1. **Check in at a POI.** The player receives an egg that carries the category of that POI.
2. **Walk.** Steps accumulate and advance every incubating egg. The app estimates steps from GPS at about 0.76 m per step, on every tab while the app is open.
3. **The egg becomes ready** once it reaches its step requirement.
4. **A toast appears** on any tab. A tap on the toast opens the Creatures tab. The player taps the egg there to hatch it.

### Egg slots
- The player starts with **3 egg slots**. All slots incubate at the same time.
- Each check-in awards one egg, as long as a slot is free.
- When all 3 slots hold an egg, a check-in awards nothing. Walking still advances the eggs already held.

### Egg tiers and step requirements
| Tier | Steps to hatch | Categories |
|---|---|---|
| Common | 100 | Heritage, Landmark, Arts |
| Rare | 1,000 | Religious, Nature |
| Epic | 5,000 | Museum |

### Creatures by category
| Category | Species | Emoji | Tier |
|---|---|---|---|
| Heritage | Stonewarden | 🗿 | Common |
| Landmark | Pathfinder | 🧭 | Common |
| Arts | Muse | 🎨 | Common |
| Religious | Luminary | 🌟 | Rare |
| Nature | Fernspark | 🌿 | Rare |
| Museum | Archivist | 📜 | Epic |
| Unknown | Wanderer | ✨ | Common |

### Creature storage cap (from Pikmin Bloom)
- A cap limits the collection: `creatureCap = 6 + (level − 1) × 2 + shopBonus`. The Creatures tab shows it as **"Collection X / Y"**.
- When an egg reaches its hatch threshold and storage is full, it **stays a ready egg** and holds its egg slot. It hatches once the player makes room.
- To free a slot, **release** a creature through the ✕ on its card and confirm. To raise the cap instead, level up or buy storage in the shop. This creates curation decisions and a coin sink.

### Design rationale
Pikmin Bloom grows seedlings from pedometer steps. Lorewalk splits the progress in two. A **visit** to a place gives the egg, because a visit is the core action. **Steps** hatch the egg and count toward the monthly medal. The web has no pedometer, so the app estimates steps from GPS while it is open. On Android, the Health Connect wrapper in `src/lib/health.ts` can replace that estimate, but nothing calls it yet.

### Future creature features
- **Bonding XP**: a visit to a POI with a creature equipped raises the bond level.
- **Evolution**: a bond level unlocks a new visual form.
- **Expeditions**: send creatures on timed away missions for extra rewards.
- **Storage cap**: limit the collection size to create curation decisions.
- **Duplicate handling**: a second copy of a species could merge its bond XP into the first.

---

## UI and UX Decisions

- **Theme**: a white background with pastel accents. There is no dark mode for now.
- **Colour tokens live in `src/lib/theme.ts`.** Import them. Do not hardcode a hex value for an accent or reward colour.
  - `accent` (`#166534`), `accentSoft` (`#eaf6ec`), and `accentAlpha(n)` hold the quiet green described below.
  - `rewardGradient` and `rewardGradientHorizontal` (`#818cf8` to `#c084fc`) hold the indigo-to-purple rarity and premium family.
  - `categoryColors` and `categoryCss(category)` hold one colour per creature type (POI category). The 3D map pins, the map companions, and the collection grid all read it.
  - The frosted-glass surface tokens live in `src/lib/glass.ts`. `theme.ts` holds the brand accent colours.
- **Pages are frosted glass over the live map**, added 2026-09-13. The map stays mounted under every tab. Each full-screen page uses `glassPage`: a translucent mint tint with a strong blur, so the area around the player shows through as soft colour. The 3D map layers stop their frame loop while another tab covers the map. Bottom sheets over a dark scrim use `glassSheet`, which is more opaque, so the scrim does not turn the sheet grey. Tune the see-through amount in `glass.ts` only.
- **Creature collection follows Pikmin Bloom and the Pokedex, not a card list.** Each creature stands bare on a flat pad in its type colour, in a 4-column grid, with its name and level below. There are no card borders, pills, or XP bars in the grid. The detail view holds that information. The wild and mythic cats render larger than the strays. A row of type-colour dots filters the grid. Each free storage slot shows as an empty pad.
- **Primary accent: quiet green, `accent` (`#166534`)**, added 2026-07-20. The green is muted on purpose, closer to Geocaching than to the saturated Duolingo `#58CC02`. A game about walking to real places reads better quiet than punchy.
  - Reference points from the real brands: Duolingo primary `#58CC02` and secondary `#89E219` (bright, high energy), Geocaching primary `#4A742C` (muted olive), and Pikmin Bloom (no published hex, but a soft pastel mint by reputation).
  - Lorewalk landed between the quietness of Geocaching and a slightly cooler green.
  - The accent covers the mint tint of the frosted pages, every `h1`, `h2`, and `h3` heading, the navigation and selection controls, and the solid-colour CTA buttons. Body text stays neutral slate `#1e293b`. The controls include the bottom nav, the Settings pickers, tabs, sort pills, selection rings, the "today" indicators, and the active-squad states. The CTA buttons include Send postcard, Add friend, Regenerate code, Save name, Send expedition, and the "Got it" dismiss.
  - One CTA stays off-brand on purpose: the rename Save button on the "Hatched!" reveal screen. It sits inside an all-violet dark reward scene. Green would clash with the palette of that scene, which differs from the everyday white-background chrome of the rest of the app.
- **Indigo to purple stays its own "reward and premium" language, separate from the accent.** It covers the egg XP bars, the level-up screen, the hatch reveal, the MAX LEVEL badges, the gradient buttons ("Collect reward", "Claim reward", "Join party walk"), and the coin-pack purchase buttons. These are *not* accent green on purpose. The contrast marks a reward or premium moment as different from ordinary navigation and everyday actions. Small text badges, such as XP pills and price and coin counts, also stay indigo and match this family.
- **Bottom navigation**: 4 tabs. Map, Creatures, Squads, Profile. Squads replaced the old Expeditions tab. See "Squad against expedition" below.
- **POI detail**: a white panel that slides up from the bottom, with a drag handle. It shows the name, the description, the category badge, the points badge, the distance when online, a learn-more link, and the check-in button.
- **Mode toggle**: an "Online mode" switch in Settings, under Connection. `localStorage` keeps the choice. Offline mode is a test mode: a tap on a landmark checks in, and purchases are simulated. The switch stays off the map, so a player does not see a test tool on the main screen.
- **Feedback**: the app uses two patterns only.
  - The **reward screen** (`showReward`) shows a real payout: a check-in, an expedition, a shrine, a food node, a medal, or a chest.
  - The **toast** (`showToast`) shows a small update: held-landmark coins, a purchase message, a locked landmark, or a ready egg. A toast can carry a route, and a tap on it opens that route.
  - Do not add a local flash message or a one-off toast.

---

## Monetisation (from the Unity game, and it applies to the PWA too)

- **Free tier**: a limited POI set, starter creatures only, and basic evolution.
- **Premium**: all POIs, unlimited creatures, the full evolution tree, exclusive landmark creatures, and the **monthly medal event** below.
- **Coin shop (IAP)**: cosmetics, extra planter and expedition slots, and convenience items. Never pay-to-win.

### Premium pricing (decided 2026-07-17, figures in SGD, Singapore is the first market)

Geocaching Premium anchors the price. It costs USD 39.99 per year, about SGD 54 per year or SGD 4.50 per month. Its standalone monthly plan costs USD 6.99, about SGD 9.50 per month.

The Geocaching tier is digital only, so its price covers no physical fulfillment. Lorewalk Premium does cover fulfillment once the medal event ships. The price therefore needs headroom over the digital-only SGD 15 per year figure that this document used before.

The exact price waits on a real medal supplier quote. CLAUDE.md's "Monetisation costs" section holds the landed-cost numbers that any price point has to clear. A medal costs SGD 12 to 20 per unit at low order volume. It falls toward SGD 6 to 10 per unit at a bulk import of 250 units or more.

### Monthly medal event (the flagship Premium perk)

Each month, a Premium subscriber gets access to a themed **event**, such as a step goal, a set of landmarks to visit, or a mini-challenge. A subscriber who finishes it earns a **unique, real, physical medal**. "Unique" means a fresh design each month, not one medal reused. That claim is the whole value pitch. The Premium upsell copy in `ProfilePage.tsx` uses the exact phrase "earn a unique real physical medal".

The claim carries a real production cost. A new design each month means a new production run each month, not one bulk order drawn down across the year.

Lorewalk does **not** mail medals. A player picks the medal up in person at a monthly community event in Singapore, listed on Meetup:

1. **Community 5k walk.** The walk is open to anyone and is not gated behind Premium. The walk itself draws the community. The medal is the Premium hook.
2. **Free drinks** afterwards.
3. **Medal pickup.** A player who finished that month's in-app challenge shows the QR code from the profile screen and takes the medal on the spot. **parkrun** uses the same model: the app tracks the achievement, and the player claims the physical reward face to face at a recurring meetup, not by mail.

- **The player earns the medal. A subscription alone does not grant one.** The subscription unlocks *eligibility* to attempt the event. Only a player who finishes the event can claim the medal. This controls cost on purpose. At low subscriber counts, one medal per subscriber per month costs more than the subscription revenue covers. See the CLAUDE.md cost breakdown. A completion gate caps the unit volume at the real finishers.
- In-person pickup removes shipping and customs completely. There is no address to collect, no courier, and no international fulfillment. It trades all of that for **event ops**: a monthly Meetup listing, a venue and a walk route, and a drinks budget in Singapore. Medal ordering, whether print-on-demand or bulk, is **still unbuilt** and needs a chosen supplier before it can go live.
- On the app side, the event needs only three things. It needs to know that a player holds Premium eligibility. It needs to track that player's progress on the current month's event. It needs to generate a **claimable QR code** on completion, for staff to scan at the event. The profile QR flow for friend invites already uses the `qrcode` package, so the event reuses that pattern instead of a new one.

### Shop (built, coins only so far)

The shop has one entry point: the coin capsule. The map HUD and the Squads tab both show it, and it opens `ShopPage` as a bottom sheet. The shop has no route. It spends the soft **coin** currency, which the player earns from expeditions and held landmarks.

- **+3 creature slots**: costs `60 + 60 × (bonus / 3)`, which climbs with each purchase.
- **+1 egg slot**: costs `120 × (slotsBought + 1)`, capped at `MAX_EGG_SLOTS_CAP` (6).

Real-money IAP waits. A coins-only shop already closes the earn-and-spend loop. The current costs are tuned for development. Rebalance them together with the duration and rate constants before launch.

### Premium entitlement (payment integration scaffolded, not live yet)

`PlayerProfile.isPremium` in `src/types/index.ts` gates the `Poi.premiumOnly` landmarks through `isPoiLocked()` in `src/lib/profile.ts`. A locked POI shows a lock badge in `PoiDetailPanel`. Both the online auto-check-in effect and the offline tap-to-check-in handler in `MapPage.tsx` skip it.

Real money runs through **Google Play Billing, wrapped by RevenueCat's Capacitor SDK** (`@revenuecat/purchases-capacitor`, `src/lib/billing.ts`). Two reasons decided this over a bare Play Billing integration or a Trusted Web Activity with the Digital Goods API. The app already ships as a Capacitor-wrapped native Android app in `android/`. RevenueCat verifies receipts server-side, so Lorewalk does not have to host its own Google Play Developer API integration.

`PremiumModal.tsx` drives the purchase and offers a Monthly and Yearly plan picker, but only when the app runs natively and online. In offline mode the same modal stays a local test-purchase toggle for development and demos.

A RevenueCat webhook (`supabase/functions/revenuecat-webhook`) verifies each purchase server-side and upserts `premium_entitlements` in Supabase. `ProfileContext.tsx` reconciles `isPremium` against that table once online. Once this is live, the table is the trusted source, not the client flag. The TODO.md WIP entry lists the exact Play Console, RevenueCat, and Supabase setup that remains before a real purchase can complete.

---

## Player Profile

### Guest profile (offline)
`localStorage` holds the profile under `lorewalk_profile`. The app creates it on first launch with the name "Explorer". The player can edit the name in-app. No sign-in is needed.

### Level system
- Each POI check-in awards XP equal to `poi.points`, which is 5 to 10 XP.
- The XP needed for the next level is `currentLevel × 100`. Level 1 to 2 costs 100 XP, level 2 to 3 costs 200 XP, and so on.
- A level-up resets the XP inside the level. `totalXp` accumulates and never resets.

### Daily streak
- The streak rises when the player checks in on consecutive calendar days.
- It resets to 1 after a skipped day.
- The profile stores it as `streakDays` and `lastVisitDate`.

### Achievements
A check-in unlocks an achievement as soon as its condition holds. The current set:

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
Each check-in appends a `VisitRecord`: `poiId`, `poiName`, `category`, the `visitedAt` ISO timestamp, and `xpEarned`. The profile page shows these records as a feed in date order.

---

## Missing next to Pikmin Bloom (build later)

| Feature | Priority | Notes |
|---|---|---|
| Memory cards | High | A postcard-style keepsake per visited landmark. The emotional hook |
| Category completion | High | "Visited 8/35 heritage sites". The collect-them-all motivation |
| Push notifications | Medium | Expedition returns, daily streak reminder |
| Friends / social feed | Medium | See where friends have explored |
| Weekly challenges | Medium | "Visit 3 new landmarks this week" |
| Step counting | Low | The web cannot do this reliably. Check-ins are the Lorewalk equivalent |
| Events calendar | Low | Tied to temporary POIs and Singapore public holidays |

---

## Squad System

### Concept
A player assembles **squads**, small teams built from creatures the player has already hatched, and stations them on the map. The value of a squad comes from **type affinity**. When the types of its members match the kind of place the player visits, the squad amplifies the rewards of that check-in. There is **no combat**. A squad never fights, and a player can never lose one. The system asks one question: which team fits where I explore today?

### Characters are creatures
A squad slot holds one existing `HatchedCreature` of the player. The **type of a creature is its `poiCategory`**: Heritage, Landmark, Arts, Religious, Museum, or Nature. The design adds no separate character entity and no separate type table. The 6 categories that already drive eggs and creatures *are* the type system.

### Structure
- There are **3 squads**, each with **4 slots**, so 12 slots in total.
- A creature can hold **at most one slot across all squads**. An assignment elsewhere moves it.
- A slot may stay empty.
- One squad is the **active squad**, the equipped party. Only the affinity of the active squad applies to a check-in.

### Affinity, and the home-or-away tradeoff
The value of a squad is type affinity, but a squad holds only one of two states at a time.

- **Home (active):** the active squad boosts the *live* check-ins of the player. On a check-in at a POI of category `C`, count the active-squad members whose type equals `C`. Call that count `m`, from 0 to 4. The check-in multiplies its XP by **`1 + 0.25 × m`**, so a full 4-of-a-kind squad doubles the XP. A member that does not match costs nothing.
- **Away (on expedition):** the squad travels to a place and earns an idle reward over time. While away it gives **no live check-in boost**, even as the active squad.

This is the core decision of the system. Keep the squad home and amplify my own walking, or send it away for hands-off rewards?

### Expeditions (the "away" loop)
- The player sends a squad to a **visited POI**, because the map already knows its coordinates. The expedition stores `startedAt` and `returnsAt`.
- **Duration scales with distance** from the current position of the player to the target. With GPS off, the centre of Singapore acts as the fallback position. `expeditionDurationMs = BASE (20s) + 8s/km`, capped at 6 minutes. These values are tuned for development, so a nearby trip finishes in about half a minute. Raise them for production, where the reward should idle across hours. The picker shows the distance and the ETA of each destination up front.
- **Rewards on collect.** Affinity to the category of the *target* scales all of them, so a Heritage-heavy squad sent to a Heritage site pays more.
  - **XP**: `EXPEDITION_BASE_XP` (25) × affinity.
  - **Coins**: `(10 + random 0 to 10)` × affinity. Coins are the soft currency in `profile.coins`. The coin shop under Monetisation spends them.
  - **Egg**: `EXPEDITION_EGG_CHANCE` (40%) to also return an egg of the target category, but **only when an egg slot is free**.
- **Lifecycle:** *Send*, then a live countdown, then **Collect** once the squad returns. Collect awards the rewards and brings the squad home. **Recall** ends the expedition early for nothing. Roster editing stays locked while the squad is away.
- An expedition is **not** combat, and it cannot fail.

### Squad against expedition
A **squad** is the team, a noun. An **expedition** is what a squad does, a verb. They are the same entities in two states. The squad you build is the thing you send. This is why **Squads** replaced the old standalone "Expeditions" tab. The squad drives an expedition now, not a lone creature.

### Companions on the map (from Pikmin Bloom)
- The app renders the **creatures of the active squad** as 3D characters that idle and wander around the position of the player. This makes the party physical. An empty slot means one companion fewer.
- While the active squad is **away on an expedition**, no companion follows. They are all at the landmark.
- While the active squad is **empty**, a few neutral grey "ambient" wanderers appear, so the map is never lifeless. Real members replace them once the player assigns creatures.
- Each companion is the same rigged Quaternius cat (`public/models/cat.glb`) that the collection thumbnails use. It plays the Idle and Walk clips of the model. The coat colour comes from the species in `src/data/creatures.ts`, and a shiny creature gets a gold tint. A companion on the map therefore matches its card in the collection. If the model does not load, a procedural shape per POI category replaces it.
- **Sizing**: the characters hold a roughly constant on-screen size, in the Pikmin Bloom style, instead of true-to-life metres. This keeps them visible at normal play zoom, about 15 and above. At the whole-island offline view they stay tiny. Zoom to street level to see them.

### Player avatar
- The avatar is a chibi cube character from the same Quaternius cube family as the creature cat. It replaced the procedural capsule figure on 2026-09-13. The user chose the cube style over realistic modular humans, so the player and the companions read as one world and stay legible at map zoom.
- There are two styles, "Short hair" and "Long hair". The picker names the hairstyle, not a gender.
- Every colour option tints the model directly: skin, hair, eyes, top, and bottom.
- An item with a different shape gets a blocky add-on built in code: the hoodie hood, jeans and cargo trousers, the skirt, every pair of shoes, and the cap, beanie, and sun hat. Cosmetics stay CC0 only, so the hats are not downloaded models.
- On the map, the avatar walks while the GPS position moves and faces the direction of travel. It idles when the player stops. The customization preview waves after each change.
- The customization screen never scrolls. The character fills the middle, and a fixed panel below it holds one tab per category (style, skin, hair, eyes, top, bottom, shoes, head item) with one row of options. The camera moves in to the head for hair, eyes, and head items, and to the feet for shoes. The player drags to turn the character. After a drag, it eases back to face the front.
- Player icons (the profile header, the friend list, friends on a landmark) show a rendered head-and-shoulders portrait of the same avatar, so a friend looks the same as on the map. A blocky SVG face in the same style shows while the portrait renders.

### Squads on the map
- A squad on an expedition shows a marker at the target POI: a 2×2 cluster of the emojis of its members.
- The marker of the **active** squad carries an indigo ring. A **returned** expedition carries a 🎁 badge.
- A tap on a squad marker opens the Squads tab.

### Claimed landmarks: light areas of control (Pokemon gym, solo)
A finished expedition **claims** that landmark for the player. **Holdings** lists the held landmarks, and the map flags each one with 🚩. The hook is collect and hold the map, not combat.

- A held landmark **accrues coins over time**, scaled by the affinity captured at the moment of the claim. The rate is `CLAIM_COINS_PER_MIN`, currently 3 per minute for testing, capped at 150. Raise both for production.
- A second expedition to the same landmark refreshes the claim and the affinity snapshot.
- There is **no PvP, no defending, and no losing**. Accumulation is purely solo. Competitive territory, such as taking the landmarks of others or a leaderboard, waits. It needs auth and a real backend.
- Coins are the soft currency in `profile.coins`. The future coin shop spends them.

### Persistence
Squads live on `PlayerProfile` in `localStorage`, next to the creatures. The app creates three empty squads on first load. It migrates an older saved profile without a `squads` field to three empty squads. This follows the same defensive pattern as `eggs` and `maxEggSlots`. A `VisitRecord` now also stores `lat` and `lon`, so a visited POI can serve as an expedition target.

### Monetisation hook
The player starts with 3 squads of 4 slots. An extra squad or slot fits the **coin shop** naturally, next to the existing "extra planter/expedition slots" line. It stays clear of pay-to-win, because affinity only amplifies the rewards that the player already earns by walking.

### Phasing
- **Phase 1 (done, 2D):** the squad data model, the builder UI, active-squad affinity on check-in, the home-and-away expedition loop (send, countdown, collect or recall), and the expedition markers on the map. Emoji and 2D presentation only.
- **Phase 2 (later):** a 3D character viewer. It renders a single Quaternius `.glb` in an isolated `<canvas>` on the squad and creature detail screen, through Three.js. The assets are CC0. The app lazy-loads them and excludes them from the PWA precache.
- **Phase 3 (later, gated on a Phase 2 perf check):** 3D squad models on the map itself, through the deck.gl `ScenegraphLayer`. This ships only when it benchmarks acceptably on a mid-range Android device.

---

## Future PWA Features (not designed yet)

- Auth through Supabase, to sync visited POIs, creatures, and points across devices.
- A loop that connects points to creature growth through check-ins.
- Push notifications for expedition returns and daily discovery POIs.
- A share card for a visited POI (social).
- A leaderboard by POIs visited and points earned.
