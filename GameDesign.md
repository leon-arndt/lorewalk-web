# Lorewalk: Game Design Document

This document records every game design decision for the Lorewalk PWA. Keep it current as the design changes. The design for the Unity and Android game lives in the CLAUDE.md of the parent project.

---

## POI System

### Two modes
- **Offline mode**: the map shows the 117 curated landmarks at once, and needs no GPS. A tap on a pin checks in. This mode serves local development and testing.
- **Online mode**: the `get_pois_near` RPC fetches the landmarks from Supabase for the full island. The bundled list shows until the fetch returns rows. The player checks in by GPS.
- Both modes add the imported places from `public/pois/sg-places.json`. See "POI tiers".

### POI tiers
The goal: a player in any part of Singapore finds something to do within a 5-minute walk. A 5-minute walk is about 400 m on foot, or about 300 m in a straight line. The 117 landmarks put only 6% of the bus stops in Singapore within 300 m of a POI. Three tiers fill the map.

| Tier | What it is | Count | XP | Egg chance | Pin |
|---|---|---|---|---|---|
| Landmark | A curated place with a written description | 117 | 5 to 10 | Always | Full size, always on the map |
| Marker | A small heritage site: an NHB historic site, a national monument, a heritage tree, a memorial, a public artwork, or a place with a Wikipedia article | About 1,480 | 3 | 35% | 62% of full size |
| Spot | A local place: a park, a garden, a place of worship, a library, or a community club | About 1,340 | 2 | 10% | 50% of full size |

- **Coverage**: with all three tiers, 70% of the bus stops have a POI within 300 m, and 80% within 400 m. The daily finds cover the rest. See "Daily Activities".
- **Pins**: a marker or a spot shows only within 1.3 km of the middle of the screen, and only from zoom 14. The map draws the nearest 160 of them. `poisInView()` in `src/lib/places.ts` holds the rule.
- **Squads**: a squad goes on an expedition to a landmark only. A player cannot claim a marker or a spot. Shrines stand at landmarks only.
- **Progress**: a check-in at any tier counts for the streak, the achievements, and the visit history.
- **Credit**: the panel names the publisher of an imported place, such as "Source: National Heritage Board". A place with a Wikipedia article shows the first lines of the article.
- **Why the egg chance is low**: a street can hold ten markers. With an egg for each check-in, the egg slots fill in one street.

### Where the imported places come from
`tools/poi-import/build_places.py` builds `public/pois/sg-places.json` from open data. Run it again to refresh the data. `tools/poi-import/README.md` holds the steps and the licenses.

- **data.gov.sg**: NHB historic sites and national monuments, NParks heritage trees and parks, STB tourist attractions, URA conserved buildings, NLB libraries, PA community clubs, and NEA hawker centres.
- **Wikidata**: each place in Singapore that has coordinates and an English Wikipedia article.
- **OpenStreetMap**: historic sites, memorials, history and nature boards, public artworks, museums, places of worship, parks, bus stops, playgrounds, and food courts.

The script drops an imported place that lies within 40 m of a place it already has. It also drops a place with the same name within 500 m. The curated landmarks go first, so no imported place sits on a landmark. The filters are heuristics. Read the file before a public launch, and remove what does not fit.

### POI types
- **Permanent POIs**: fixed places. The pin takes the colour of its category.
- **Temporary POIs**: event POIs with an expiry time. The pin is purple. The stops of the trail of the week are temporary POIs.

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

## Daily Activities

Each of these changes with the day, so a street that the player knows still holds something new. All of them use Singapore time, and all of them are the same for every player.

### Food at hawker centres
- A food node shows at a hawker centre, a food court, or a kopitiam. The places file holds about 640 of these food spots.
- Up to 5 idle food nodes show near the player. The game takes the 10 nearest food spots within 1.5 km, and the date selects which of them hold food. The date also selects the dish.
- A food spot gives one node in a day. After the player collects it, the spot stays empty until the next day.
- A node with creatures on the way stays on the map, wherever the player goes.
- Without a GPS fix, the middle of the map takes the place of the player.
- 85% of the bus stops in Singapore have a POI or a food spot within 400 m.
- `spawnFoodNodes()` in `src/lib/profile.ts` holds the rules. Before this change, 15 food nodes stood at landmarks across the island, so a player far from a landmark saw none.

### Daily finds
- A find is a small pickup: coins, and sometimes a dish. The player walks within 50 m, and the game picks it up and shows a toast. In offline mode a tap picks it up.
- Finds lie at public spots: bus stops, playgrounds, and fitness corners. The places file holds about 6,400 of these, at most one in each 120 m square. Each bus stop in Singapore has one within 300 m.
- The map splits into cells of about 440 m. On each day, 65% of the cells hold a find. The date selects the cells and the spot in each cell.
- **Night finds** show only at night, in 30% of the cells. They give more coins.
- **Rain finds** show only while it rains near the player, in 40% of the cells. They always give a dish.
- A find shows within 900 m of the player. `dailyFinds()` in `src/lib/places.ts` holds the rules.

| Find | Shows | Coins | Dish |
|---|---|---|---|
| Find (✨) | All day | 4 to 10 | 20% |
| Night find (🌙) | At night | 12 to 20 | 35% |
| Rain find (☔) | In the rain | 8 to 14 | Always |

### Trail of the week
- Each week, from Monday to Sunday, one planning area holds a trail of 5 stops. The week selects the area and the stops. An area needs at least 10 markers.
- A stop is a temporary POI with its own id. A player can therefore check in at a stop that stands on a marker they visited before. The stop takes the place of that marker for the week.
- A stop gives 8 XP and always an egg, if a slot is free. The fifth stop also gives 60 coins.
- A purple chip on the map names the area and the count of visited stops. A tap shows the nearest open stop.
- `trailOfTheWeek()` in `src/lib/places.ts` holds the rules. The trail needs no server. A hand-made event still goes in the `temporary_pois` table.

---

## Map

- **Default zoom**: 14. The wider view fits more POIs on screen.
- **Default centre**: Singapore (1.3521, 103.8198), used when the browser has no GPS fix.
- **Player marker**: an indigo dot with a soft halo ring.
- **Tile source**: OpenFreeMap "Liberty" vector tiles. They are free, need no key, and carry 3D buildings and transit POIs. The map tilts 45 degrees for depth. The community funds the tiles, so self-host them or move to a paid provider for high-volume production.
- **Next stop bar**, added 2026-11-27: a slim line near the bottom of the map, above the Weekly Walk and News buttons, shows the one most useful thing to do. The whole bar is one button. `pickNextGoal()` in `src/lib/nextGoal.ts` holds the order. A reward that is ready comes first: an egg to hatch, a squad that is back, then the streak chest. The button opens the tab that holds it. After that comes the nearest landmark that the player has not visited and that is not locked, with its distance. A tap moves the camera there and opens the panel of the landmark. It does not check in. The bar hides while a panel is open, and it does not show when nothing is ready and every nearby landmark is visited. The action sits in a red cap at the end of the bar. For a landmark, the map also draws a dashed red line from the player to it. The line runs straight: it shows the direction, not a route. The bar changes no game rule.
- **Week strip**: the row of step rings for this week sits on the Profile page, below the explorer card. It was on the map until 2026-11-27. A tap opens the journal. On the map, a tap on the step counter opens the journal too.
- **Parchment**: the map is drawn in sepia tones, like a map in the journal. `mapAmbience.ts` moves each colour of the Liberty style onto a sepia ramp and keeps a share of its hue, so water stays blue-grey and a park stays sage. Labels are ink on paper by day.
- **Day, night, and weather**: the map follows the Singapore clock and the real weather from data.gov.sg. The map turns blue at night, and building windows stay lit until people go to bed. Clouds and rain show when the nearest forecast and rain gauge report them. These effects are visual only and change no game rule.

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
`src/data/creatures.ts` holds the roster. Most species are cats: strays (common), community cats (rare), and wild cats (epic), each tied to a POI category. The **Singapore critters** are the animals that every Singaporean hears in the neighbourhood:

| Species | Model | Category | Tier |
|---|---|---|---|
| Cicada | cicada | Nature | Common |
| Kampung Chicken | chicken | Heritage | Common |
| Asian Koel ♀ (brown and spotted) | koel | Landmark | Common |
| Red Junglefowl | chicken | Nature | Rare |
| Asian Koel ♂ (black, with a red eye) | koel | Landmark | Rare |
| Emperor Cicada | cicada | Nature | Epic |

A critter has its own procedural model in `src/lib/animalModels.ts`. The cats share the rigged cat model. The ambient wanderers on the map are a kampung chicken, a female koel, and a cicada. The first critter build named the male koel "Asian Koel" and the female "Speckled Koel". `normalizeProfile()` renames both.

An older roster held species such as the Stonewarden (a statue) and the Luminary. `normalizeProfile()` turns each creature of a species that no longer exists into the critter of its POI category, and the creature keeps its level and XP. The four legendaries (Merlion, Stone Lion, White Tiger, Singa) are gone as well. None of them could hatch.

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

- **Theme: a field journal**, decided 2026-11-27. The app looks like the scrapbook of an explorer on smooth cream paper: hairline edges, strips of striped tape, sticker outlines, and red stamps. There is no dark mode. This look replaced the frosted glass and the quiet green accent that the app had before. The first version of the look had ruled paper, heavy ink outlines, and index tabs. The "Vellum and Scrapbook" mix replaced it on the same day.
- **Colour tokens live in `src/lib/theme.ts`.** Import them. Do not hardcode a hex value.
  - `paper`, `paperLight`, `paperCard`, and `paperShade` are the paper tones.
  - `line` is the hairline of a card. `edge` is the hairline of a tag, a button, or a panel.
  - `ink`, `inkSoft`, and `inkHint` are the text colours. All three pass the contrast check on paper.
  - `stamp` is red ink. It marks stamps, alerts, destructive actions, reward moments, and the open tab.
  - `forest` shows progress and success. `ochre` shows coins, medals, and Premium. `indigo` shows links.
  - `accent` equals `ink`. Headings, selection, and filled buttons use it.
  - `categoryColors` and `categoryCss(category)` hold one colour per creature type (POI category). The colours are muted, like watercolour washes. The 3D map pins, the map companions, and the collection grid all read them.
- **Surfaces live in `src/lib/paper.ts`.** `paperPage` is the page. `paperPanel` and `paperSheet` are the panel and the sheet over the map. `paperTag` is a tag. `paperCardStyle` is a card. `SCRIM` is the dark veil behind a sheet. Do not add a colour gradient or a soft drop shadow.
- **Tracing paper over the map**: `hudTag` and `vellum()` in `paper.ts` are the one place that uses a blur. The controls that float over the map and the tab bar are about 72 percent solid, with a light blur of the map behind them. Tune `HUD_ALPHA` and `HUD_BLUR` there. Cards, panels, and pages stay solid.
- **Building blocks live in `src/components/UI/Journal.tsx`**: `PageHeader`, `SectionTitle`, `NoteCard`, `Stamp`, `Postmark`, `InkButton`, and `Mono`. Use them before you write a new inline style.
- **Fonts**: Fredoka is the display font and the body font. DM Mono is the typewriter font for captions, counters, and labels. The app uses the weights 400, 500, and 600 only. Text uses seven sizes: 11, 12, 13, 15, 19, 24, and 28 px (`TYPE` in `paper.ts`). An ESLint rule rejects any other `fontSize`. An emoji that stands in for an icon can be 48 or 64 px. The level number on the level-up stamp is larger, because it is part of the stamp art.
- **Shapes**: every button, tag, and map marker has a 10 px corner (`RADIUS` in `paper.ts`), so no control is rounder than another. A card has 6 px and a note panel has 12 px. A circle is only for an avatar, a ring, a dot, a level sticker, or a colour swatch. An edge is a 1 px hairline. A strong ink outline is only for a selected item. A feature card can sit a little crooked.
- **Tape and stickers**: `tape` and `TAPES` in `paper.ts` give striped washi tape in mint, mustard, and coral. A note has at most one strip. A creature or an egg has a white edge, like a die-cut sticker (`STICKER`). A shiny creature has an ochre edge.
- **Pages cover the map.** The map stays mounted under every tab, and its 3D layers stop their frame loop while a page covers it. A page is opaque paper, so the map does not show through.
- **Creature collection is a specimen album.** Each creature sits on a card with a wash of its type colour, in a 3-column grid. The card shows the name and the field-guide number. The level is a red sticker on the edge of the card, and every second card has a strip of tape. A round postmark at the top shows how many species are recorded. A row of type-colour dots filters the grid. Below it, the "Field guide" section shows each species that the player has not hatched yet as a grey outline with its number. A species counts as recorded while the player holds one creature of it.
- **Reward and Premium moments use red stamp ink and ochre**, not the ink accent. The contrast marks a reward as different from ordinary navigation. This covers the reward screen, the level-up screen, the hatch reveal, and the purchase buttons.
- **Bottom navigation**: 4 tabs. Map, Creatures, Squads, Profile. Squads replaced the old Expeditions tab. The tabs sit in one floating bar of tracing paper. The open tab has a lighter patch and a red line below it. See "Squad against expedition" below.
- **POI detail**: a paper panel that slides up from the bottom, with a drag handle. It shows the name, the description, the category badge, the points badge, the distance when online, a learn-more link, and the check-in button.
- **Mode toggle**: an "Online mode" switch in Settings, under Connection. `localStorage` keeps the choice. Online mode is the default. A player who never touched the switch starts online. Offline mode is a test mode: a tap on a landmark checks in, and purchases are simulated. The switch stays off the map, so a player does not see a test tool on the main screen.
- **Feedback**: the app uses two patterns only.
  - The **reward screen** (`showReward`) shows a real payout: a check-in, an expedition, a shrine, a food node, a medal, or a chest.
  - The **toast** (`showToast`) shows a small update: held-landmark coins, a purchase message, a locked landmark, or a ready egg. A toast can carry a route, and a tap on it opens that route.
  - Do not add a local flash message or a one-off toast.
  - A reward screen never scrolls as a page. A long list of rewards sits in a window inside the card, and the window follows each reward as it shows.

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

Coin packs for real money have code, but no store product exists yet. The server records each verified purchase in `coin_grants`, and the client adds the coins from that record. A coins-only shop already closes the earn-and-spend loop. The current costs are tuned for development. Rebalance them together with the duration and rate constants before launch.

### Premium entitlement (payment integration scaffolded, not live yet)

`PlayerProfile.isPremium` in `src/types/index.ts` gates the `Poi.premiumOnly` landmarks through `isPoiLocked()` in `src/lib/profile.ts`. A locked POI shows a lock badge in `PoiDetailPanel`. Both the online auto-check-in effect and the offline tap-to-check-in handler in `MapPage.tsx` skip it.

Real money runs through **Google Play Billing, wrapped by RevenueCat's Capacitor SDK** (`@revenuecat/purchases-capacitor`, `src/lib/billing.ts`). Two reasons decided this over a bare Play Billing integration or a Trusted Web Activity with the Digital Goods API. The app already ships as a Capacitor-wrapped native Android app in `android/`. RevenueCat verifies receipts server-side, so Lorewalk does not have to host its own Google Play Developer API integration.

`PremiumModal.tsx` drives the purchase and offers a Monthly and Yearly plan picker, but only when the app runs natively and online. In offline mode the same modal stays a local test-purchase toggle for development and demos.

A RevenueCat webhook (`supabase/functions/revenuecat-webhook`) verifies each purchase server-side and upserts `premium_entitlements` in Supabase. `ProfileContext.tsx` reconciles `isPremium` against that table once online. Once this is live, the table is the trusted source, not the client flag. The TODO.md WIP entry lists the exact Play Console, RevenueCat, and Supabase setup that remains before a real purchase can complete.

---

## Player Profile

### Guest profile
`localStorage` holds the profile under `lorewalk_profile`. The app creates it on first launch with the name "Explorer". The player can edit the name in-app. No sign-in is needed to play.

### Account and cloud save
A guest profile lives on one device. A player who signs in with Google in Settings gets a cloud save, and can then move to a new phone or play on two devices.

- **Optional**: sign-in never blocks play. A guest keeps every feature except the cloud save.
- **Google only**: one tap, and no password to forget. The sign-in keeps the player id of the guest, so the friends, the Premium entitlement, and the medal claims stay.
- **Automatic**: the app uploads a change a few seconds after the player makes it. It downloads a newer save when the player opens the app.
- **Second device**: a device with no progress takes the cloud save without a question.
- **Two saves**: when the device and the account each hold progress that the other lacks, the app asks the player which save to keep. It does not merge them, because a merge of two full profiles can duplicate creatures or coins. The player can put the choice off, and Settings then shows it again.
- **Sign-out**: the profile stays on the device, so a failed upload loses nothing. Settings always shows the "Sign out" button. For a guest the button is off, with a hint to sign in with Google first, because a guest has no login to come back to.
- **Steps**: each device counts its own steps, and the day's total is the sum across devices.
- **Not in the cloud save**: the journal photos. They stay on the device.
- **Delete account**: Settings has a "Delete account" button for every player, guest or signed in, online or offline. After one confirmation the server deletes the save, the friends, the public stats, the medal claims, and the account itself. The device then deletes its profile and its journal photos and starts again as a new guest. The player cannot undo this. In offline mode the app uses the session that it stored before. A guest that never went online has no server rows, so only the device copy goes. A player who has server rows but no session gets an error, and nothing changes. A Premium subscription does not end with the account, so the dialog tells a subscriber to cancel it in Google Play first.

### Level system
- Each POI check-in awards XP equal to `poi.points`, which is 5 to 10 XP.
- The XP needed for the next level is `currentLevel × 100`. Level 1 to 2 costs 100 XP, level 2 to 3 costs 200 XP, and so on.
- A level-up resets the XP inside the level. `totalXp` accumulates and never resets.
- **The weekly party walk opens at level 5**, added 2026-11-27 (`WEEKLY_WALK_UNLOCK_LEVEL` in `profile.ts`). Below that level the map button shows a lock, and a tap shows a toast with the level. A player who already has a walk keeps it. Level 5 needs 1,000 XP in total.

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
- While the active squad is **empty**, three "ambient" wanderers appear, a kampung chicken, a koel, and a cicada, so the map is never lifeless. Real members replace them once the player assigns creatures.
- Each cat companion is the same rigged Quaternius cat (`public/models/cat.glb`) that the collection thumbnails use. A critter companion uses its model from `animalModels.ts`, with legs, wings, and head moved in code. It plays the Idle and Walk clips of the model. The coat colour comes from the species in `src/data/creatures.ts`, and a shiny creature gets a gold tint. A companion on the map therefore matches its card in the collection. If the model does not load, a procedural shape per POI category replaces it.
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

- A loop that connects points to creature growth through check-ins.
- Push notifications for expedition returns and daily discovery POIs.
- A share card for a visited POI (social).
- A leaderboard by POIs visited and points earned.
