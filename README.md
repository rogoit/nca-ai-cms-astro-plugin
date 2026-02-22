# NCA AI CMS Astro Plugin

An Astro plugin that adds an AI-powered content editor to your site. Generate articles and images with Google Gemini, schedule posts, and manage everything from a built-in editor UI.

**Never code alone** — this is an open source project by [Never Code Alone](https://nevercodealone.de).

## What it does

- Adds an `/editor` page with a React-based UI for content management
- Generates articles and images using Google Gemini AI
- Schedules and auto-publishes posts as Markdown files
- Handles authentication so your host project stays simple

## Setup

### 1. Install

```bash
npm install nca-ai-cms-astro-plugin @astrojs/node @astrojs/react @astrojs/db react react-dom @google/genai @google/generative-ai gray-matter marked sanitize-html sharp turndown zod
```

### 2. Add to your Astro config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import ncaAiCms from 'nca-ai-cms-astro-plugin';

export default defineConfig({
  integrations: [ncaAiCms()],
});
```

The plugin auto-registers `react()`, `db()`, `output: 'server'`, and the `@astrojs/node` adapter. You can still set them manually if you need custom options.

### 3. Create `.env.local`

```env
EDITOR_ADMIN=admin
EDITOR_PASSWORD=your-secure-password
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

| Variable | Required | Purpose |
|---|---|---|
| `EDITOR_ADMIN` | Yes | Login username for the editor |
| `EDITOR_PASSWORD` | Yes | Login password for the editor |
| `GOOGLE_GEMINI_API_KEY` | Yes | Google Gemini API key for content and image generation |

Add `.env.local` to your `.gitignore` — never commit secrets.

### 4. Start the dev server

```bash
npx astro dev
```

- Login: http://localhost:4321/login
- Editor: http://localhost:4321/editor (redirects to login if not authenticated)

### Requirements

- Astro 5+
- Node.js 18+

## Options

```ts
ncaAiCms({
  contentPath: 'src/content/blog', // where Markdown files are saved (default: 'nca-ai-cms-content')
  autoPublish: true,               // auto-publish scheduled posts (default: true in production)
});
```

## Routes added

| Route | Description |
|---|---|
| `/login` | Login page |
| `/editor` | Content editor UI |
| `/api/auth/*` | Authentication endpoints |
| `/api/generate-content` | Generate article text |
| `/api/generate-image` | Generate article image |
| `/api/save` | Save Markdown file |
| `/api/prompts` | Manage prompt templates |
| `/api/scheduler` | Manage scheduled posts |
| `/api/articles/*` | Article operations |

All `/api/*` and `/editor` routes are protected by cookie-based authentication.

## Development

```bash
npm test          # run tests
npm run typecheck # check types
```

## License

MIT
