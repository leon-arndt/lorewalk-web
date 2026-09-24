# Lorewalk Particle Editor

A VSCode editor for the particle effects of the game, such as fireworks,
sparkles, and confetti. It reads and writes `public/vfx/vfxbank.json`. The
runtime `src/lib/vfx.ts` loads the same file.

## Run it

1. Start the dev server with `npm run dev`. The preview needs it.
2. Link the editor into the extensions directory once, then reload the window:

   ```bash
   ln -sfn "$PWD/tools/vscode-particles" ~/.vscode/extensions/lorewalk.lorewalk-particles-0.1.0
   ```

3. Open the Command Palette and run **Lorewalk: Open Particle Editor**.

As an alternative to the link, add a debug entry to `.vscode/launch.json`, the
same as for the soundbank editor. The repository ignores `.vscode/`, so each
clone needs its own entry:

```json
{
  "name": "Particle Editor (extension)",
  "type": "extensionHost",
  "request": "launch",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}/tools/vscode-particles", "${workspaceFolder}"]
}
```

The extension is plain JavaScript. There is no build step and no dependency to
install.

## Preview

The right side of the panel shows `src/dev/vfxPreview.html` from the dev server
in a frame. That page plays the effect with the game's own particle code on the
game's map, so the preview matches the game. The player avatar stands at the
Merlion for scale.

- Each change replays the effect at once.
- Click the map to move the effect.
- **Repeat** replays a one-shot effect every few seconds.
- Press **Ctrl+S** to save.

If the dev server does not run, the preview shows a message and a **Retry**
button.

## What an effect holds

An effect is a list of emitters, plus a `loop` flag. Code plays an effect by id:
`playMapVfx('fx/fireworks', [lng, lat])`.

| Field | Effect |
| --- | --- |
| `delay`, `duration` | When the emitter starts, and how long it emits at `rate`. A duration of 0 gives a burst only. |
| `burst`, `rate` | Particles at once when the emitter starts, and particles per second while it runs. |
| `life` | `[min, max]` seconds that a particle lives. |
| `shape`, `radius`, `offset` | Where a particle starts: a point, a sphere, or a ring. |
| `direction`, `spread`, `speed` | The emission cone and the start speed. A spread of 180 emits in every direction. |
| `gravity`, `drag`, `spin` | Motion over the life of a particle. A negative gravity floats up. |
| `size`, `alpha` | `[start, end]` size in units and opacity. |
| `colors`, `endColor` | Each particle picks one start color at random, then fades toward the end color. An empty end color keeps the start color. |
| `sprite`, `blend` | The particle shape (`glow`, `star`, `disc`, `square`) and the blend mode. |
| `twinkle` | Flicker, from 0 (steady) to 1. |
| `onDeath` | An emitter that bursts where each particle dies. |
| `trail`, `trailRate` | An emitter that each living particle leaves behind. |

An emitter that another emitter names in `onDeath` or `trail` is a child. A
child uses only its burst count. It ignores `delay`, `duration`, and `rate`.

One unit is 1 m at zoom 20. The player avatar is 5.6 units tall, and a
companion cat is 3.2 units tall.

The map is light, so additive blending washes out there. Use normal blending for
a color that must show in daylight.
