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
npm install nca-ai-cms-astro-plugin
```

### 2. Add to your Astro config

```ts
// astro.config.mjs
import ncaAiCms from 'nca-ai-cms-astro-plugin';

export default defineConfig({
  integrations: [ncaAiCms()],
});
```

### 3. Environment variables

```env
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
EDITOR_ADMIN=your-username
EDITOR_PASSWORD=your-password
```

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_GEMINI_API_KEY` | Yes | Google Gemini API key for content and image generation |
| `EDITOR_ADMIN` | Yes | Username for editor login |
| `EDITOR_PASSWORD` | Yes | Password for editor login |

### 4. Requirements

- Astro 5+
- `@astrojs/db` and `@astrojs/react` integrations
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
