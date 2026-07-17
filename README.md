# Lorewalk Web

A browser-based PWA companion to the Lorewalk Android game: walk to real-world Singapore landmarks, check in, hatch creatures, and grow your collection. Full game design lives in [GameDesign.md](GameDesign.md).

## Monthly Community Event (Singapore)

Once a month, Lorewalk Premium runs a real-life meetup in Singapore, listed on [Meetup](https://www.meetup.com/):

1. **Community 5k walk** together.
2. **Free drinks** afterwards.
3. **Medal pickup** — players who completed that month's in-app challenge show the QR code from their profile to collect their unique physical medal on the spot. Parkrun-style: the achievement is earned digitally, the medal is claimed in person, not mailed.

**Location:** [Temasek Shophouse](https://www.temasekshophouse.org.sg/) (Orchard Rd) or similar. It's next to Fort Canning Park, so the walk route loops through heritage/nature POIs before ending back at the venue for drinks and pickup. Not yet booked, just the leading candidate. See [CLAUDE.md](CLAUDE.md) for tradeoffs.

See [GameDesign.md](GameDesign.md) for the full design rationale and [CLAUDE.md](CLAUDE.md) for the cost breakdown behind it.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
