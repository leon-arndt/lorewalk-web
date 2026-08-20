# Lorewalk Soundbank

A VSCode editor for the sound events of the game, in the vein of FMOD. It reads
and writes `public/sounds/soundbank.json`. The runtime `src/lib/sfx.ts` loads the
same file.

## Run it

The repository ignores `.vscode/`, so each clone needs its own debug entry. Add
this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Soundbank Editor (extension)",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}/tools/vscode-soundbank", "${workspaceFolder}"]
    }
  ]
}
```

Then press F5 and select "Soundbank Editor (extension)". In the new window, run
**Lorewalk: Open Soundbank Editor** from the Command Palette. Keep the focus in a
code file or the file tree when you press F5. A webview panel takes the key
first.

To install the editor in every window instead, link it into the extensions
directory and reload:

```bash
ln -sfn "$PWD/tools/vscode-soundbank" ~/.vscode/extensions/lorewalk.lorewalk-soundbank-0.1.0
```

The extension is plain JavaScript. There is no build step and no dependency to
install.

## Sound packs

A pack is a directory below `public/sounds/packs/`:

```
public/sounds/packs/<pack-id>/
  pack.json      # name, author, license, attribution, sample labels
  *.mp3          # the samples
```

To add a pack, unzip it into a new directory and write a `pack.json`.

The editor lists every audio file that it finds on disk. The manifest holds
metadata only. Keep the license field correct, because the project uses CC0
assets.

## What an event holds

| Field | Effect |
| --- | --- |
| `bus` | `sfx` or `music`. The bus selects which volume slider the event obeys. |
| `loop` | Repeats until stopped. A music event sets this. |
| `samples` | Candidate files with a weight. The runtime picks one at random per play. |
| `gain` | Per-event level, multiplied by `masterGain` and the player's volume slider. |
| `rate` | `[min, max]` playback rate. The runtime picks a value at random per play. |
| `lowpassHz` | Lowpass cutoff. A low value takes the edge off a bright sample. |
| `cooldownMs` | Minimum time between two plays of the event. |
| `maxVoices` | Maximum number of instances that play at the same time. |

A music event streams through an audio element in `useBackgroundMusic`, not
through the Web Audio graph. The rate, the lowpass, the cooldown, and the voice
cap therefore do not apply to it. The editor hides those four fields when the bus
is `music`.

## Preview

The preview button uses the same audio graph as the game, so what you hear is
what the game plays.

- Press **Space** to play the selected event. Press it again to stop.
- The waveform above the preview button shows the sample. A playhead moves
  through it while the sound plays.
- Click a point in the waveform to play from that point. This helps with a long
  music track.

## Event ids

Code calls `playSfx('ui/click')`. The delegated click handler in `App.tsx` also
reads the `data-sfx` attribute of an element.

A `data-sfx` value with a slash is a full event id. A bare value is shorthand for
the `ui/` namespace, so `data-sfx="close"` selects `ui/close`. An unknown id
plays nothing and throws no error.
