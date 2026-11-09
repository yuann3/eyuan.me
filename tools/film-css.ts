// Writes templates/partials/film_css.html, the Film's static fallback, from the
// palettes film.ts draws: one rule set per state and scheme. Run it after
// changing scripts/film-palettes.ts:
//
//   bun tools/film-css.ts
import { writeFileSync } from 'node:fs';
import { FILM_STATES, palette, gradientCss, type FilmLayout, type Scheme } from '../scripts/film-palettes';

function filmRules(layout: FilmLayout, scheme: Scheme = 'light') {
	return FILM_STATES.map((state) => {
		const p = palette(state, layout, 'drain', scheme);
		const root = state === 'idle' ? 'html:not([data-section])' : `html[data-section="${state}"]`;
		const pct = (n: number) => `${+(n * 100).toFixed(3)}%`;
		// Vertical lengths against max(panel height, ref) when the palette has a ref.
		const vert = (n: number) => (p.ref ? `calc(${+n.toFixed(5)} * max(100%, ${p.ref}px))` : pct(n));
		const blobs = p.blobs.map((b, i) =>
			`${root} .film-fallback i:nth-child(${i + 1}){left:${pct(b.x)};top:${vert(b.y)};width:${pct(b.w)};height:${vert(b.h)};filter:blur(${b.blur}px);opacity:${b.opacity};background-color:${b.color}}`);
		const gradient = gradientCss(p);
		const size = p.ref ? `;background-size:100% max(100%, ${p.ref}px)` : ';background-size:auto';
		return [
			`${root} .film-fallback{background-image:${gradient.replace('in oklab ', '')};background-image:${gradient}${size}}`,
			...blobs,
		].join('\n');
	}).join('\n');
}

// Dark rules come last, so they win only under the dark media query.
const css = [
	filmRules('desktop'),
	`@media (max-width: 767px){\n${filmRules('mobile')}\n}`,
	`@media (prefers-color-scheme: dark){\n.film-fallback{background-color:${palette('idle', 'desktop', 'drain', 'dark').stops[0].color}}\n${filmRules('desktop', 'dark')}\n}`,
	`@media (prefers-color-scheme: dark) and (max-width: 767px){\n${filmRules('mobile', 'dark')}\n}`,
].join('\n');

writeFileSync(
	new URL('../templates/partials/film_css.html', import.meta.url),
	`{# Written by tools/film-css.ts from scripts/film-palettes.ts. Don't edit it by hand. #}\n<style>{% raw %}${css}{% endraw %}</style>\n`,
);
