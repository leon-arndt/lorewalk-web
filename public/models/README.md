# Creature and map character models

## Creature collection thumbnails

`cat.glb` holds the rigged cat mesh. The creature card, the creature detail
screen, and the companions on the map all use it. It is the CC0
[Cat by Quaternius](https://poly.pizza/m/qKICY6xla2) on poly.pizza. It replaced
an older Quaternius "Cat_Blob" model, which had a round body and no legs.

The download colours the cat from one texture atlas. The atlas is shared across
the whole animal pack. A one-time conversion split the mesh by atlas swatch into
flat materials and removed the atlas. The conversion also shortened the clip
names. The materials are:

| Material        | Parts                         | Tinted |
|-----------------|-------------------------------|--------|
| `Cat_Main`      | body, head, tail, outer ears  | coat colour |
| `Cat_Secondary` | muzzle, paws, inner ears      | a paler coat colour |
| `Eye_Black`     | eyes                          | no     |
| `Nose`          | nose                          | no     |

`tintCat()` in `src/lib/catModel.ts` retints one shared mesh per coat `color` of a
creature (see `data/creatures.ts`). This avoids one model per coat variant.

Animation clips: Idle, Idle_Eating, Walk, Run, Jump_Start, Jump_Loop, Headbutt, Death.

# POI pin models

`mapPoiPins.ts` draws each landmark on the map as a small 3D pin. The
`PIN_MODELS` map in that file names one model per category. Each entry is a
`.glb` file in this folder or a procedural builder in the code. If a file fails
to load, the pin keeps its old primitive shape.

| Category  | Model                     | Source                                                                 |
|-----------|---------------------------|------------------------------------------------------------------------|
| nature    | `pin-nature.glb`          | `tree_oak` from the [Kenney Nature Kit](https://kenney.nl/assets/nature-kit), CC0 |
| heritage  | `pin-heritage.glb`        | [Building](https://poly.pizza/m/qOhhGLftam) by Kay Lousberg, CC0       |
| landmark  | `pin-landmark.glb`        | [Light House](https://poly.pizza/m/KRebJXIRb8) by MaverickFX, CC0      |
| museum    | `buildMuseum()` in code   | A columned facade with a pediment                                      |
| religious | `buildTemple()` in code   | Stacked tiers under flared roofs                                       |
| arts      | `buildEasel()` in code    | An easel with a painted canvas                                         |

Three categories use procedural models, because no CC0 download fit them:

- **museum**: no CC0 classical museum exists on Poly Pizza or Kenney.
- **religious**: most of the religious landmarks in Singapore are Hindu or
  Chinese temples. A church or mosque model would misrepresent them. Stacked
  tiers read as both a pagoda and a gopuram.
- **arts**: the CC0 easels were too thin to read at pin size.

The loader fits each model into a cube of the pin height, by its largest side,
and centres its footprint on the pin. It replaces the model materials with flat
Lambert materials, because many exports set `metallicFactor` to 1 and render
near-black without an environment map. The Lambert materials keep the colour,
the texture, and the vertex colours of the model.

Materials named in `PIN_TINTED_MATERIALS` take the category colour: the tree
foliage (`leafsGreen`) and the procedural roofs and canvas (`pinAccent`). On a
visited pin, those materials turn green and all other colours get a pale green
wash.

To add or replace a model:
1. Get a small CC0 `.glb` whose front faces +z. The default camera looks north,
   so +z (south) faces the player.
2. Shrink its textures to 256 px and quantize it. A pin covers about 40 pixels,
   so a 2048 px texture only costs GPU memory:
   `npx -p sharp -p @gltf-transform/cli gltf-transform optimize in.glb out.glb --compress quantize --texture-size 256`
3. Save it here as `pin-<category>.glb` and point `PIN_MODELS` at it.
4. To tint a part with the category colour, add its material name to
   `PIN_TINTED_MATERIALS`.

The Kenney Nature Kit also holds GLB and OBJ files for rocks, flowers, bushes,
and about 40 other trees, such as palms and pines.

# Map character models

The companions on the map use `cat.glb`, the same model as the collection
thumbnails. `MapView.tsx` passes `CAT_MODEL_URL` from `src/lib/catModel.ts` to
`addCharacterLayer`. The layer fits the model to a fixed height, so the units of
the file do not matter. It plays the Idle and Walk clips. `tintCat()` in
`catModel.ts` retints each clone per coat colour. The thumbnail code uses the same
function.

If the model does not load, each creature category falls back to its own
procedural 3D shape. The shapes are in the table below.

## Procedural creature shapes (fallback)

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

### To use a different shared animated model
1. Save the file in this directory.
2. Pass its URL as `modelUrl` to the `addCharacterLayer` call in `MapView.tsx`.
3. Name its tintable materials `Cat_Main` and `Cat_Secondary`, or change the set
   in `catModel.ts`.

### To use one model per species or category (better long term)
Extend `mapCharacters.ts`. Add a `categoryModelUrl` map, load each entry through
`GLTFLoader`, and cache the result by category. Fall back to the procedural
builder when a model is absent.

## Player avatar

The player avatar is a chibi cube character. `src/lib/playerAvatar.ts` builds
it, and both the map layer (`mapPlayerAvatar.ts`) and the customization preview
(`CharacterCustomizationPage.tsx`) use it. `PlayerAppearance.bodyId` picks the
model:

| Style      | File                    | Source                                                           |
|------------|-------------------------|------------------------------------------------------------------|
| Short hair | `avatar-short-hair.glb` | [Cube Guy Character](https://poly.pizza/m/K1IczhnvQ5) by Quaternius, CC0   |
| Long hair  | `avatar-long-hair.glb`  | [Cube Woman Character](https://poly.pizza/m/75ikp7NEDx) by Quaternius, CC0 |

Both come from the same Quaternius cube family as `cat.glb`. Like the cat, each
download coloured itself from one small texture atlas. A one-time conversion
split the mesh by atlas swatch into five flat materials and removed the atlas:
`Skin` (with the hands and the bare feet), `Hair`, `Eyes`, `Top`, and `Bottom`.
The conversion also kept only the Idle, Walk, and Wave clips and quantized the
mesh. The app tints each material from `PlayerAppearance`.

Items whose shape differs get blocky add-ons, built in code in
`addItemShapes()`: the hoodie hood and pocket, the jacket front, jeans and cargo
trousers over the shins, the skirt, every pair of shoes, and the cap, beanie,
and sun hat. The code measures the rest pose of the model and sizes each add-on
from it, so one set of numbers fits both bodies. Each add-on attaches to a bone
(`Head`, `Torso`, `Hips`, `LowerLegL`, `FootL`, and so on), so it follows the
animation. Only CC0 assets go in. Almost every hat model on Poly Pizza is
CC-BY 3.0, so the hats stay procedural.

If the model does not load, a procedural capsule humanoid takes its place. The
service worker does not precache `.glb` files, so this can happen offline.

## Animation clip naming

The loader looks for a clip whose name contains `idle` or `walk`, in any case. It
falls back to `run`, then to the first clip available.

If a model moonwalks, add `+ Math.PI` to `c.root.rotation.y` in `tick()`.
