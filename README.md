# Lorewalk Web

A browser-based PWA companion to the Lorewalk Android game. Walk to real Singapore landmarks, check in, hatch creatures, and grow your collection.

The Android app uses Unity and ARCore. This web app drops the AR and keeps the map, the collection, and the expeditions. Chrome installs it to the home screen through "Add to Home Screen".

Read [GameDesign.md](GameDesign.md) for the full game design. Read [CLAUDE.md](CLAUDE.md) for the architecture notes and the cost numbers behind the monetisation.

## Quick start

1. Install the dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings.
4. Start the dev server: `npm run dev`. It listens on `localhost:8849`.

The map falls back to Singapore (1.3521, 103.8198) when the browser gives no GPS fix. Both the Geolocation API and PWA install need HTTPS. For a phone test, run `vite --host` and put a tunnel such as ngrok in front of it.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on `localhost:8849` |
| `npm run build` | Type-check with `tsc -b`, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end suite. Starts the dev server itself |
| `npm run android` | Build, `cap sync`, then open Android Studio |

Run `npm run test:e2e` before you commit a gameplay change.

## Stack

React 19 and TypeScript on Vite. MapLibre GL JS draws the map from OpenFreeMap "Liberty" vector tiles at a 45 degree pitch. three.js draws the creature companions, the POI pins, and the MRT lines as custom map layers. Supabase holds the backend, and the Unity client shares the same project. Capacitor 7 wraps the app for Android and reads step data through Health Connect. Tailwind CSS v4 handles styling, and `vite-plugin-pwa` handles the service worker.

## Monthly community event (Singapore)

Once a month, Lorewalk Premium runs a real meetup in Singapore. The event appears on [Meetup](https://www.meetup.com/).

1. Walk the community 5k together.
2. Drink for free afterwards.
3. Collect the medal. A player who finished that month's in-app challenge shows the QR code from the profile screen and takes the medal on the spot.

The model follows parkrun: the player earns the achievement in the app, then claims the medal in person. Lorewalk does not mail medals.

**Venue:** [Temasek Shophouse](https://www.temasekshophouse.org.sg/) on Orchard Road, or a similar site. It sits next to Fort Canning Park, so the walk route can loop through heritage and nature POIs and end back at the venue for drinks and pickup. Nobody has booked it yet. It is the leading candidate. [CLAUDE.md](CLAUDE.md) lists the tradeoffs.

## Documentation style

The Markdown docs in this repo follow ASD-STE100 Simplified Technical English. The rules and the checker live in [.claude/skills/ste-writing/](.claude/skills/ste-writing/). Run the checker after you edit a doc:

```bash
python3 .claude/skills/ste-writing/ste-lint.py README.md CLAUDE.md GameDesign.md TODO.md
```
