# Lorewalk Web

A browser-based PWA companion to the Lorewalk Android game. Walk to real Singapore landmarks, check in, hatch creatures, and grow your collection.

The Android app uses Unity and ARCore. This web app drops the AR and keeps the map, the collection, and the expeditions. Chrome installs it to the home screen through "Add to Home Screen".

Lorewalk is not a digital-only product. A Premium player earns real metal tokens for a monthly step goal and collects them in person. See [Step Tokens](#step-tokens).

Read [GameDesign.md](GameDesign.md) for the full game design. Read [CLAUDE.md](CLAUDE.md) for the architecture notes and the cost numbers behind the monetisation.

## Quick start

1. Install the dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings. Google sign-in and the cloud save also need `VITE_GOOGLE_CLIENT_ID`. The app runs without it.
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
| `npm run android:apk` | Build, `cap sync`, then make the debug APK. Needs JDK 21 |

Run `npm run test:e2e` before you commit a gameplay change.

## Stack

React 19 and TypeScript on Vite. MapLibre GL JS draws the map from OpenFreeMap "Liberty" vector tiles at a 45 degree pitch. three.js draws the creature companions, the POI pins, and the MRT lines as custom map layers. Supabase holds the backend, and the Unity client shares the same project. Capacitor 7 wraps the app for Android and reads step data through Health Connect. Tailwind CSS v4 handles styling, and `vite-plugin-pwa` handles the service worker.

## Step Tokens

A real token gives the game a value that a screen cannot give. The player can hold it, keep it, and show it to a friend.

- **Real.** The token is a metal coin with two sides, not an in-app badge.
- **Earned by steps at any place.** A player who walks 200,000 steps in a month reaches the Monthly Step Goal. The walk can be a commute, a park, or a landmark.
- **A goal for years.** A token comes after 1, 3, 6, and 12 goal months, then every 6 months.
- **Premium months count.** Every player sees the goal. Only a month with Premium counts, and only a Premium player collects a token, one each month.
- **Collected in person.** The player takes the token at the monthly Community Walk below.

Most games in this genre sell digital rewards only. The token is what Lorewalk Premium adds on top. Nobody has picked a supplier yet. [GameDesign.md](GameDesign.md) holds the design, and [CLAUDE.md](CLAUDE.md) holds the cost numbers.

## Community Walk (Singapore)

Once a month, Lorewalk Premium runs a real meetup in Singapore. The event appears on [Meetup](https://www.meetup.com/).

1. Walk the community 5k together.
2. Drink for free afterwards.
3. Collect the token. A Premium player who collected a Step Token in the app shows its QR code from the profile screen and takes the token on the spot.

The model follows parkrun: the player earns the achievement in the app, then claims the token in person. Lorewalk does not mail tokens.

**Venue:** [Temasek Shophouse](https://www.temasekshophouse.org.sg/) on Orchard Road, or a similar site. It sits next to Fort Canning Park, so the walk route can loop through heritage and nature POIs and end back at the venue for drinks and pickup. Nobody has booked it yet. It is the leading candidate. [CLAUDE.md](CLAUDE.md) lists the tradeoffs.

## Documentation style

The Markdown docs in this repo follow ASD-STE100 Simplified Technical English. The rules and the checker live in [.claude/skills/ste-writing/](.claude/skills/ste-writing/). Run the checker after you edit a doc:

```bash
python3 .claude/skills/ste-writing/ste-lint.py README.md CLAUDE.md GameDesign.md TODO.md
```
