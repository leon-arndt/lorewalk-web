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

## Animation clip naming

The loader looks for clips whose name contains `idle` or `walk` (case-insensitive),
falling back to `run`, then the first available clip.

If models moonwalk, flip `c.root.rotation.y` by `+ Math.PI` in `tick()`.
