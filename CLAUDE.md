# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal site and blog (https://eyuan.me), built with [yuanme](https://github.com/yuann3/yuanme) and Tailwind 4. It is a fully static site. The design source of truth is the Paper file "eyuan.me — Thin Film redesign", page "v2 — simple".

This `yuanme` branch is the port from Astro (yuanme#39, #75). yuanme's parity test compares its build with Astro's build of `main` at 6567e01, under the Parity exceptions in yuanme's `docs/parity-exceptions.md`; yuanme's `reference-site.lock` pins the commit of this branch it checks.

## Commands

- `yuanme dev`: serve the Site with its Drafts, rebuilt on every change.
- `yuanme check`: report every error and warning without writing the Site.
- `yuanme build`: build into `dist/`. The build report is `.yuanme/report.md`.
- `yuanme docs` lists yuanme's docs; `yuanme docs CODE` explains a Diagnostic.
- `bun tools/film-css.ts` rewrites the Film's static fallback (`templates/partials/film_css.html`) after a change to `scripts/film-palettes.ts`.

yuanme downloads the Tailwind CLI it runs (`[tailwind] version` in `yuanme.toml`). Nothing else is installed: there is no `package.json`.

## Architecture: one shell, two states

Every Page renders inside `templates/layouts/shell.html`, which is a two-column layout: a left column (wordmark, headline, nav, footer links) and a rounded "film" panel on the right.

- **Idle and expanded states.** Templates that don't set `section` are **idle**: this is only `/` and the 404. Templates that set `section` (`about | projects | writing | resume`) are **expanded**: the left column collapses to a 300px rail and the panel grows across the page.
  - The state lives on `<html data-state data-section>`. All state styling keys off those attributes.
  - Child routes set their parent's section. Projects use `projects`. Posts, the Writing list, `/archive/`, tags and series use `writing`.
- **Navigation.** Every navigation is a full page load until the Router swaps Pages (yuanme#76). `scripts/shell.ts` runs the first reveal; the panel swap and morph it ran under Astro's ClientRouter come back then.
  - Never set attributes on `<html>` from JS.
- **The panel scrolls, not the window.** Panel content is its own scroll container. On desktop the window never scrolls, so don't use `window.scrollTo`.
- **The film.** `scripts/film.ts` is a WebGL fragment shader that draws the living gradient. `scripts/film-palettes.ts` holds the per-state palettes, which come from Paper.
  - `templates/partials/film_css.html` is a static CSS fallback written from the same palettes. It shows under `prefers-reduced-motion`, without WebGL, and before the first frame is drawn.
  - The film also listens for `film:preview` and `film:impulse` events on `document`.
- **Shared UI.**
  - `templates/components/panel_header.html` is the title, an optional `actions` slot and `CLOSE ×`.
  - Shared classes such as `.rows`/`.row`, `.label-mono`, `.prose-panel`, and the motion helpers (`data-reveal`, `data-reveal-group`, `.row-link`, `.press`) live in `styles/global.css`. A Template's own styles are its Sidecar, such as `templates/components/list_row.css`, scoped to the tags that Template writes.
  - Motion follows the beUI motion patterns: ease-out `cubic-bezier(0.16,1,0.3,1)` for entrances, ease-in-out `cubic-bezier(0.77,0,0.175,1)` for movement, and under 300ms by default. Use the CSS var tokens instead of new curves.
- **Navigation data.** The nav sections and footer links are the Data files `data/nav.yaml` and `data/footer_links.yaml`.

## Content

Content lives in `content/<collection>/*.md`, and `yuanme.toml` declares each Collection's fields:

- `posts`: Posts at `/blog/<slug>/`, listed on `/blog/` (Writing), sorted by `order`, then newest first. `tags` are shown lowercase. `series` groups Posts at `/series/<name>/`.
- `projects`: project pages at `/projects/<slug>/`, listed in the order of their `order` field, from Paper.
  - `summary` is the short one-liner shown on the `/projects/` list; without it, the list falls back to `description`. `summary_short` is the mobile one.
  - `stack` is shown lowercased by the Templates, and uppercased by the CSS.
  - `hero` is `{ url, alt }` here, and `{ src, alt }` on Posts.
- Dates are ISO: `date: 2025-12-12`.
- Resume content is `data/resume.yaml`. The PDF is `static/YiyuanLi_Resume.pdf`; `data/resume.tex` is its source and isn't part of the build.
- The About photos are `images/about/`, listed in `data/photos.yaml`.
- **Slugs** come from the file name, lowercased (`Pew.md` → `/projects/pew/`), unless the front matter sets `slug:`.
- Other images go in `static/` and are referenced by absolute path.
- `draft: true` leaves an Entry out of the build (`yuanme dev` shows it); `unlisted: true` builds its Page but leaves it out of every list, Taxonomy, the feed and the sitemap.
