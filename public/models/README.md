# Creature and map character models

## Creature collection thumbnails

`cat.glb` holds the base rigged cat mesh. The creature card and the creature detail
screen use it for their thumbnails, in place of the emoji placeholders. It is CC0,
by [Quaternius](https://poly.pizza/m/2f54vbV0In) on poly.pizza.

Its materials are flat-shaded and carry the names `Cat_Main`, `Cat_Secondary`,
`Ears`, `Eye_White`, and `Eye_Black`. `creaturePreview.ts` therefore retints one
shared mesh per coat `color` of a creature (see `data/creatures.ts`). This avoids
one model per coat variant.

Animation clips: Idle, Walk, Jump, Dance, Bite_Front, HitRecieve, Death, Yes, No.

# Map character models

Each creature category renders its own procedural 3D shape by default, and this
needs no file. To override every shape with one shared animated model, drop a CC0
`.glb` here as `character.glb`. To load one GLB per category instead, extend
`mapCharacters.ts`.

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

## Replacement with real CC0 models

Good sources, all CC0 or public domain:

- **Kenney**: https://kenney.nl/assets. Search for "creature" or "animal".
  Download a `.glb` pack and drop the single files you want in here.
- **Quaternius**: https://quaternius.com. The Ultimate Animated Character Pack
  ships rigged humanoids with `Idle`, `Walk`, and `Run` clips.
- **Poly Pizza**: https://poly.pizza. Filter by CC0.

### To use one shared animated model for every category
1. Save the file as `public/models/character.glb`.
2. Pass `modelUrl: '/models/character.glb'` to the `addCharacterLayer` call in `MapView.tsx`.

### To use one model per category (better long term)
Extend `mapCharacters.ts`. Add a `categoryModelUrl` map, load each entry through
`GLTFLoader`, and cache the result by category. Fall back to the procedural
builder when a model is absent.

## Player avatar

`mapPlayerAvatar.ts` renders the on-map character of the player. By default it
builds a procedural blocky humanoid and colours it from `PlayerAppearance`
(`src/types/index.ts`): skin tone, hair colour, eye colour, top, bottom, and
shoes colour, plus an optional head item. This needs no file. It follows the same
procedural placeholder convention as the creature shapes above.

### Replacement with a real CC0 rig

Drop a rigged humanoid `.glb` in here as `player-avatar.glb`. The app picks it up
automatically and the code needs no change. Export the file with:

- **Materials named `Skin`, `Hair`, and `Eyes`.** The app clones and retints these
  per `PlayerAppearance`. This is the same technique as the `Cat_Main` and
  `Cat_Secondary` retinting in `creaturePreview.ts`. See the "Creature collection
  thumbnails" section above.
- **Child mesh nodes with the prefixes `Top_`, `Bottom_`, `Shoes_`, and `Head_`**,
  one node per cosmetic item id in `src/data/cosmetics.ts`. Examples: `Top_tee`,
  `Top_hoodie`, `Bottom_jeans`, `Head_cap`. The app shows only the node that
  matches the equipped id and hides the rest.

Good CC0 sources for a modular humanoid rig with tintable skin and eyes:

- **Quaternius Universal Base Characters**: https://quaternius.com/packs/universalbasecharacters.html
  (6 base proportions, 20 hairstyles, tintable skin and eyes, glTF, humanoid rig).
- **Quaternius Modular Character Outfits**: https://quaternius.itch.io/modular-character-outfits-fantasy
  (62 modular tops, bottoms, shoes, and headwear pieces, CC0, glTF. They retarget
  onto the Universal Base Characters rig above).
- **Kenney Modular Characters**: https://kenney.nl/assets/modular-characters
  (CC0, 75 or more skins, 40 or more accessories).

Both Quaternius packs are itch.io "name your own price" downloads, so set the
price to 0. Download them by hand, then export and rename the pieces to the
convention above.

## Animation clip naming

The loader looks for a clip whose name contains `idle` or `walk`, in any case. It
falls back to `run`, then to the first clip available.

If a model moonwalks, add `+ Math.PI` to `c.root.rotation.y` in `tick()`.
