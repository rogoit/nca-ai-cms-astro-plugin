# v1.0.5

## Fix: SettingsTab crash on prompts response
- `/api/prompts` returns `{ prompts, settings }` but SettingsTab cast the entire response as `Prompt[]`
- Fixed to extract `data.prompts` from the response object

## Auto-register dependencies
- Plugin now auto-configures `output: 'server'`, `@astrojs/node` adapter, `react()`, and `db()` via `updateConfig()`
- Consumer config is now just `integrations: [ncaAiCms()]`
- Existing manual config is respected — auto-registration only kicks in when not already set

## Setup guide in README
- Full install command with all peer dependencies
- `.env.local` setup with variable reference table
- Minimal `astro.config.mjs` example

---

# v1.0.4

## Fix: Environment variables and route prerendering

### Environment variables now work with Astro's .env files
- `getEnvVariable()` now reads from `import.meta.env` first, with a `process.env` fallback
- Previously only checked `process.env`, which meant `.env` / `.env.local` files were ignored in Astro dev and SSR
- Works in all environments: local dev, Docker, GitLab CI/CD

### All injected routes are now server-rendered
- Added `prerender: false` to all 18 injected routes (API, auth, pages)
- Consumers no longer need to set `output: 'server'` globally in their Astro config
- The plugin works with Astro's default `output: 'static'` — only plugin routes are server-rendered

### Minor: use `import.meta.env.PROD` for auto-publish check
- Replaced `process.env.NODE_ENV === 'production'` with Astro's built-in `import.meta.env.PROD`
