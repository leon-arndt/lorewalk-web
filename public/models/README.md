# Creature + map character models

## Creature collection thumbnails

`cat.glb` — base rigged cat mesh used for creature-card/detail thumbnails (replaces
the emoji placeholders). CC0, by [Quaternius](https://poly.pizza/m/2f54vbV0In)
(poly.pizza). Materials are flat-shaded and named `Cat_Main` / `Cat_Secondary` /
`Ears` / `Eye_White` / `Eye_Black` so `creaturePreview.ts` can retint a single
shared mesh per creature's coat `color` (see `data/creatures.ts`) instead of
needing one model per coat variant. Animation clips: Idle, Walk, Jump, Dance,
Bite_Front, HitRecieve, Death, Yes, No.

# Map character models

Each creature category renders a distinct procedural 3D shape by default (no file
needed). Drop a CC0 `.glb` here as `character.glb` to override all shapes with a
shared animated model, or extend `mapCharacters.ts` to load per-category GLBs.

## Procedural creature shapes (built-in placeholders)

| Category  | Shape              | Inspiration        |
|-----------|--------------------|--------------------|
| nature    | Leafling           | Pikmin leaf-sprout |
| heritage  | Stonekin           | Dome-shell turtle  |
| arts      | Drifter            | Jellyfish          |
| religious | Glowick            | Lantern spirit     |
| museum    | Hooter             | Owl                |
| landmark  | Warden             | Horned guardian    |
| (default) | Blob               | Friendly round blob|

## Replacing with real CC0 models

Good sources (all CC0 / public domain):

- **Kenney** — https://kenney.nl/assets — search "creature" or "animal".
  Download a `.glb` pack and drop individual files here.
- **Quaternius** — https://quaternius.com — Ultimate Animated Character Pack
  ships rigged humanoids with `Idle` / `Walk` / `Run` clips.
- **Poly Pizza** — https://poly.pizza — filter by CC0.

### To use a shared animated model (all categories same mesh):
1. Save as `public/models/character.glb`
2. Pass `modelUrl: '/models/character.glb'` in the `addCharacterLayer` call in `MapView.tsx`

### To use per-category models (recommended long-term):
Extend `mapCharacters.ts` → add a `categoryModelUrl` map, load each via `GLTFLoader`,
cache by category, and fall back to the procedural builder when absent.

## Player avatar

The player's own on-map character (`mapPlayerAvatar.ts`) renders a procedural blocky
humanoid by default, colour-coded per `PlayerAppearance` (`src/types/index.ts`):
skin tone, hair colour, eye colour, top/bottom/shoes colour, and an optional head
item - no file needed, same "procedural placeholder" convention as the creature
shapes above.

### Replacing with a real CC0 rig

Drop a rigged humanoid `.glb` here as `player-avatar.glb` and it's picked up
automatically, no code changes required. It must be exported with:

- **Materials named `Skin`, `Hair`, `Eyes`** - these get cloned and retinted per
  `PlayerAppearance` (same technique as `Cat_Main`/`Cat_Secondary` retinting in
  `creaturePreview.ts` - see the "Creature collection thumbnails" section above).
- **Child mesh nodes prefixed `Top_`, `Bottom_`, `Shoes_`, `Head_`**, one per
  cosmetic item id in `src/data/cosmetics.ts` (e.g. `Top_tee`, `Top_hoodie`,
  `Bottom_jeans`, `Head_cap`) - only the node matching the equipped id is shown,
  the rest are hidden.

Good CC0 sources for a modular humanoid rig with tintable skin/eyes:

- **Quaternius Universal Base Characters** - https://quaternius.com/packs/universalbasecharacters.html
  (6 base proportions, 20 hairstyles, tintable skin/eyes, glTF, humanoid rig).
- **Quaternius Modular Character Outfits** - https://quaternius.itch.io/modular-character-outfits-fantasy
  (62 modular tops/bottoms/shoes/headwear pieces, CC0, glTF, retargets onto the
  Universal Base Characters rig above).
- **Kenney Modular Characters** - https://kenney.nl/assets/modular-characters
  (CC0, 75+ skins, 40+ accessories).

Both Quaternius packs are itch.io "name your own price" downloads (set to 0),
so grab them manually and export/rename the pieces per the convention above.

## Animation clip naming

The loader looks for clips whose name contains `idle` or `walk` (case-insensitive),
falling back to `run`, then the first available clip.

If models moonwalk, flip `c.root.rotation.y` by `+ Math.PI` in `tick()`.
