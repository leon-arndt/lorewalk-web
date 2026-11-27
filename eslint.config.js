import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // supabase/functions runs on Deno (Deno.serve, npm: specifiers), not part
  // of this Vite/browser project - linting it here would just flag Deno
  // globals as undefined.
  globalIgnores(['dist', 'supabase/functions']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The type scale (TYPE in src/lib/paper.ts): seven text sizes, plus 48
      // and 64 for an emoji that stands in for an icon.
      'no-restricted-syntax': ['error', {
        selector: "Property[key.name='fontSize'][value.type='Literal']:not([value.raw=/^(11|12|13|15|19|24|28|48|64)$/])",
        message: 'Use a size from the type scale: 11, 12, 13, 15, 19, 24, or 28 (48 or 64 for an emoji icon).',
      }],
    },
  },
])
