# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal site and blog (https://www.eyuan.me), built with Astro 5, Tailwind 3, and MDX. It is a fully static site. The design source of truth is the Paper file "eyuan.me — Thin Film redesign", page "v2 — simple".

## Commands

- `npm run dev`: start the dev server at localhost:4321.
- `npm run build`: runs `astro check` (type-checks `.astro`/`.ts` and validates content frontmatter against the Zod schemas), then `astro build` into `dist/`.
- `npm run preview`: serve the built `dist/`.

There are no tests and no linter. `astro check` through `npm run build` is the only verification step. Both `package-lock.json` and `pnpm-lock.yaml` are committed; npm is the one in use.

## Architecture: one shell, two states

Every page renders inside `src/layouts/Shell.astro`, which is a two-column layout: a left column (wordmark, headline, nav, footer links) and a rounded "film" panel on the right.

- **Idle and expanded states.** Pages without a `section` prop are **idle**: this is only `/` (and 404). Pages with `section` (`about | projects | writing | resume`) are **expanded**: the left column collapses to a 300px rail and the panel grows across the page.
  - The state lives on `<html data-state data-section>`. All state styling keys off those attributes.
  - Child routes pass their parent's section. `/projects/[slug]` uses `projects`. `/blog/*`, `/archive`, `/tags*` and `/series*` use `writing`.
- **Navigation keeps the shell.** Navigation uses `<ClientRouter />` with a **custom swap** (`src/scripts/shell.ts`, on `astro:before-swap`). The rail, the panel frame and the film canvas are never replaced. Only the `<html>` attributes, the `<head>` and the `[data-panel-content]` element are swapped, and that swap is what drives the CSS transitions.
  - Consequence for page scripts: a `<script>` in panel content runs once per full page load. Bind behaviour in an `astro:page-load` listener that guards for its own elements and queries through `[data-panel-content]`, because the outgoing content is briefly still in the DOM.
  - Never set attributes on `<html>` from JS. They are overwritten on every navigation.
- **The panel scrolls, not the window.** Panel content is its own scroll container. On desktop the window never scrolls, so don't use `window.scrollTo`.
- **The film.** `src/scripts/film.ts` is a WebGL fragment shader that draws the living gradient. `src/scripts/film-palettes.ts` holds the per-state palettes, which come from Paper.
  - Shell builds a static CSS fallback from the same palette data. The fallback shows under `prefers-reduced-motion`, without WebGL, and before the first frame is drawn.
  - The film also listens for `film:preview` and `film:impulse` events on `document`.
- **Shared UI.**
  - `src/components/PanelHeader.astro` is the title, an optional `actions` slot and `CLOSE ×`.
  - Shared classes such as `.rows`/`.row`, `.label-mono`, `.prose-panel`, and the motion helpers (`data-reveal`, `data-reveal-group`, `.row-link`, `.press`) live in `src/styles/global.css`.
  - Motion follows the beUI motion patterns: ease-out `cubic-bezier(0.16,1,0.3,1)` for entrances, ease-in-out `cubic-bezier(0.77,0,0.175,1)` for movement, and under 300ms by default. Use the CSS var tokens instead of new curves.
- **Navigation data.** Nav sections, their paths and the footer links are defined in `src/consts.ts` (`SECTIONS`, `FOOTER_LINKS`).

## Content

Content lives in `src/content/<collection>/*.md(x)`, and the schemas are in `src/content/config.ts`:

- `blog`: posts at `/blog/<slug>`, listed on `/blog` (Writing). `tags` are lowercased and de-duplicated by the schema. `series` groups posts at `/series/<name>`.
- `project`: project pages at `/projects/<slug>`.
  - `summary` is the short one-liner shown on the `/projects` list; without it, the list falls back to `description`.
  - `stack` is lowercased by the schema and shown uppercased.
  - Here `heroImage` is `{ url, alt }`, not `src`.
  - The order of the `/projects` list is set explicitly in `src/pages/projects/index.astro` to match Paper. Add new projects to that order.
- Resume content is in `src/data/resume.ts`. The PDF is `public/YiyuanLi_Resume.pdf`.
- **Slugs** come from the filename, lowercased (`Pew.md` → `/projects/pew`), unless the frontmatter sets `slug:`.
- **Images** go in `public/` and are referenced by absolute path.

How visibility flags behave (`src/utils/post.ts`, `getAllPosts`):
- `draft: true` hides a post from production builds but still shows it in dev.
- `hide: true` hides a post only from the `/blog` listing, which calls `getAllPosts(true)`. On that listing `draft` is *not* checked in production.
- `src/pages/rss.xml.js` reads `getCollection('blog')` directly, so drafts and hidden posts **do** appear in the RSS feed.

## Path aliases

`@/utils` → `src/utils/index.ts` (a barrel file: add new helpers there), `@/components/X` → `src/components/X.astro`, `@/layouts/X` → `src/layouts/X.astro`. Import aliased components and layouts without the `.astro` extension.
