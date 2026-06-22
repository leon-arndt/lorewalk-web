# Map character models

Drop a Quaternius (or any) animated glTF here as **`character.glb`** and the map's
3D wandering characters will use it. Without it, the map falls back to a procedural
capsule character so the feature still works.

## Getting a model

1. Go to https://quaternius.com/ (assets are CC0 — free, no attribution required).
2. A good pick: the **Ultimate Animated Character Pack** — rigged humanoids that ship
   with named clips like `Idle`, `Walk`, `Run`.
3. Export/download a single character as **`.glb`** (binary glTF) and save it here as
   `public/models/character.glb`.

## Notes

- The loader matches animation clips by name: it looks for a clip containing `idle`
  and one containing `walk` (falling back to `run`, then the first clip).
- If characters face backwards while walking, flip the facing angle by `Math.PI`
  in `src/lib/mapCharacters.ts` (`tick()` → `c.root.rotation.y`).
- Scale: the model is assumed to be roughly in metres (a ~1.8-unit-tall character
  reads as ~1.8 m). Adjust `modelScale` in the `addCharacterLayer` call if needed.
- Keep models small — they are lazy-loaded, but big files slow the first map view.
