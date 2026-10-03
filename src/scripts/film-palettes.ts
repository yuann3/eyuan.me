// Film palettes, taken from the Paper artboards ("v2 — simple").
// Shared by the WebGL film (src/scripts/film.ts) and the static CSS
// fallback that Shell.astro renders from the same data.

export type FilmState = 'idle' | 'about' | 'projects' | 'writing' | 'resume';
export type FilmLayout = 'desktop' | 'mobile';
// Follows `prefers-color-scheme`. Light is Paper's palettes; dark is the
// nocturnal set below (same structure, geometry and drift).
export type Scheme = 'light' | 'dark';

// Vertical gradient, top to bottom. `at` is 0..1 of the panel height.
export type Stop = { color: string, at: number };

// A soft pill: x/y/w/h are fractions of the panel's reference size,
// blur is in px (CSS `filter: blur()`), opacity 0..1.
export type Blob = { color: string, x: number, y: number, w: number, h: number, blur: number, opacity: number };

// `ref` > 0: stops and blob y/h are fractions of max(panel height, ref px)
// instead of the panel height.
export type Palette = { stops: Stop[], blobs: Blob[], grain: number, ref: number };

type Geometry = Omit<Blob, 'color'>;

// px → fractions of the artboard panel the values were measured on.
const geo = (W: number, H: number, l: number, t: number, w: number, h: number, blur: number, opacity: number): Geometry =>
	({ x: l / W, y: t / H, w: w / W, h: h / H, blur, opacity });

// Blob order everywhere: magenta, violet, straw, seafoam.
const GEOMETRY: Record<FilmLayout, Record<'idle' | 'expanded', Geometry[]>> = {
	desktop: {
		idle: [
			geo(580, 872, -120, 300, 460, 220, 60, 0.7),
			geo(580, 872, 260, 470, 420, 200, 64, 0.55),
			geo(580, 872, 200, 170, 380, 160, 50, 0.8),
			geo(580, 872, -60, 690, 420, 200, 56, 0.7),
		],
		expanded: [
			geo(1126, 872, -80, 330, 620, 220, 60, 0.55),
			geo(1126, 872, 560, 520, 600, 200, 64, 0.6),
			geo(1126, 872, 480, 120, 560, 160, 50, 0.6),
			geo(1126, 872, 40, 720, 600, 200, 56, 0.6),
		],
	},
	mobile: {
		idle: [
			geo(374, 296, -80, 110, 300, 120, 40, 0.7),
			geo(374, 296, 170, 170, 270, 110, 42, 0.55),
			geo(374, 296, 130, 40, 250, 90, 36, 0.8),
			geo(374, 296, -40, 260, 280, 110, 38, 0.7),
		],
		expanded: [
			geo(374, 828, -90, 320, 320, 180, 50, 0.55),
			geo(374, 828, 160, 500, 320, 180, 52, 0.6),
			geo(374, 828, 120, 90, 300, 140, 44, 0.6),
			geo(374, 828, -40, 690, 320, 180, 48, 0.6),
		],
	},
};

// 06 is a full-scroll export: the Resume wash spans a 1234px tall panel
// with the same pixel blobs as the other sections.
const RESUME_H = 1234;
const RESUME_GEOMETRY: Geometry[] = [
	geo(1126, RESUME_H, -80, 330, 620, 220, 60, 0.55),
	geo(1126, RESUME_H, 560, 520, 600, 200, 64, 0.6),
	geo(1126, RESUME_H, 480, 120, 560, 160, 50, 0.6),
	geo(1126, RESUME_H, 40, 720, 600, 200, 56, 0.6),
];

const WASH_AT = [0, 0.26, 0.5, 0.72, 1];

const COLORS: Record<FilmState, { stops: string[], at?: number[], blobs: string[] }> = {
	idle: {
		stops: ['#F2F2F0', '#F2F2F0', '#EFE2A6', '#E2588F', '#6D4FD6', '#3E8FE0', '#8EE3C8'],
		at: [0, 0.14, 0.29, 0.47, 0.63, 0.8, 1],
		blobs: ['#EC6FA0', '#5A44D0', '#F3E7B4', '#9BEBD2'],
	},
	projects: {
		stops: ['#F7F6F4', '#F6F0DC', '#F5E3EA', '#EAE4F7', '#E2EFF7'],
		blobs: ['#F4CFE0', '#D9CEF6', '#F7EAC2', '#CFEFE4'],
	},
	about: {
		stops: ['#FBF7F2', '#F7EED9', '#F6DCE4', '#EEDFF6', '#E3EEFB'],
		blobs: ['#F4CFE0', '#D9CEF6', '#F7EAC2', '#CFEFE4'],
	},
	writing: {
		stops: ['#F1F3F4', '#E3F2EE', '#F5F0D8', '#F3E1EC', '#E2E5F6'],
		blobs: ['#EFD6E6', '#D4DBF5', '#F2EDCF', '#C9ECE4'],
	},
	resume: {
		stops: ['#F6F7F6', '#E8F3E5', '#DDEEE2', '#E7E1F5', '#DCDEEC'],
		at: [0, 0.26, 0.5, 0.74, 1],
		blobs: ['#D9EDD3', '#DED8F3', '#D3ECE2', '#D4DCF0'],
	},
};

// Dark: the panel glows out of a dark page. Idle keeps the flat top band
// (near the dark paper) and glows below it; the section washes are deep,
// low-chroma tints (OKLab L ~0.19-0.22) of each light wash's hues, so
// #ECEDEE text keeps >= 12:1 on every pixel.
const DARK_COLORS: typeof COLORS = {
	idle: {
		stops: ['#121318', '#121318', '#73512D', '#B8407A', '#5038C0', '#2264B8', '#1F8C78'],
		at: [0, 0.12, 0.28, 0.46, 0.63, 0.8, 1],
		blobs: ['#C24A80', '#4330A8', '#795531', '#23806F'],
	},
	projects: {
		stops: ['#161514', '#20160C', '#27141C', '#1F172C', '#0E1F29'],
		blobs: ['#361A28', '#271F3A', '#2D2218', '#032C22'],
	},
	about: {
		stops: ['#171411', '#20160C', '#2A121B', '#231529', '#111E2D'],
		blobs: ['#361A28', '#271F3A', '#2D2218', '#032C22'],
	},
	writing: {
		stops: ['#141516', '#071D18', '#22180E', '#281421', '#191B2E'],
		blobs: ['#341A2C', '#1D223D', '#2D2218', '#022C25'],
	},
	resume: {
		stops: ['#141514', '#101C0C', '#0A2013', '#1F172C', '#1A1B2C'],
		at: [0, 0.26, 0.5, 0.74, 1],
		blobs: ['#182A12', '#271F3A', '#062C21', '#1B233B'],
	},
};

// The idle film drifts through a small family of related palettes. They all
// share Drain's stop positions, blob geometry and silver top, so the panel
// still emerges from the paper; only the hues change. "drain" is Paper's
// palette and the static fallback.
export type IdleVariant = 'drain' | 'dusk' | 'aurora' | 'lagoon';

export const IDLE_VARIANTS: Record<IdleVariant, { stops: string[], blobs: string[] }> = {
	drain: COLORS.idle,
	// Warmer: straw, coral, rose, violet.
	dusk: {
		stops: ['#F2F2F0', '#F2F2F0', '#F3DE9E', '#EE7C68', '#D3487F', '#7C4CCB', '#E7B3D9'],
		blobs: ['#F08672', '#8A43BE', '#F6E1AA', '#F3B7CB'],
	},
	// Cooler: mint, sky, periwinkle, orchid.
	aurora: {
		stops: ['#F2F2F0', '#F2F2F0', '#C6EFD6', '#4FB6E6', '#6A6CDF', '#B65FD0', '#9BE0EE'],
		blobs: ['#62CDE8', '#5C58D6', '#D3F2DE', '#E3A6EA'],
	},
	// Fresh: lime straw, teal, cobalt, violet, blush.
	lagoon: {
		stops: ['#F2F2F0', '#F2F2F0', '#E8EBB0', '#46BFAE', '#3F6FDF', '#8C5BE0', '#F2AACB'],
		blobs: ['#45BCC2', '#4A50D6', '#EEF0BE', '#F5BBD5'],
	},
};

// Dark counterparts of the idle family: the same hue journeys as glowing
// bands under a dark top.
export const DARK_IDLE_VARIANTS: Record<IdleVariant, { stops: string[], blobs: string[] }> = {
	drain: DARK_COLORS.idle,
	dusk: {
		stops: ['#121318', '#121318', '#6E5428', '#B8503E', '#A8346A', '#5A34A8', '#8A4A88'],
		blobs: ['#C25A48', '#5E30A0', '#6E5530', '#9A4A78'],
	},
	aurora: {
		stops: ['#121318', '#121318', '#2A6247', '#1E7AAE', '#4440B8', '#8A3AA8', '#1F7E92'],
		blobs: ['#2486AE', '#3E3AB0', '#32684A', '#8E4AA0'],
	},
	lagoon: {
		stops: ['#121318', '#121318', '#70571E', '#1F8A7E', '#2A4EB8', '#6438B8', '#A84A7C'],
		blobs: ['#1F8890', '#3438B0', '#745928', '#A85082'],
	},
};

// The film's hues as published to the page (--film-1..4: the headline
// gradient and the droplets). Light: the variant's band colours. Dark: more
// luminous versions of the same hues, so the text glows on the dark page.
const DARK_HUES: Record<IdleVariant, string[]> = {
	drain: ['#E8C878', '#F27BAA', '#B48CF5', '#7AB4F2'],
	dusk: ['#EEC57E', '#F59A86', '#EE7FB0', '#B48CF5'],
	aurora: ['#8EE0B8', '#7CCBF2', '#A0A2F5', '#D68CEC'],
	lagoon: ['#D8DC8A', '#6FD6C6', '#8AA6F5', '#B892F5'],
};

export function filmHues(variant: IdleVariant, scheme: Scheme = 'light'): string[] {
	return scheme === 'dark' ? DARK_HUES[variant] : IDLE_VARIANTS[variant].stops.slice(2, 6);
}

// Nav hover preview on idle: a vivid version of each section's wash, in the
// same hue order, so the film leans toward where the click will land
// without turning pale. Same structure as the idle palettes.
export const SECTION_ACCENTS: Record<Exclude<FilmState, 'idle'>, { stops: string[], blobs: string[] }> = {
	// straw, pink, lavender, sky
	projects: {
		stops: ['#F2F2F0', '#F2F2F0', '#F1E0A0', '#E8789F', '#9A7BE0', '#6FB2E8', '#A9D8F2'],
		blobs: ['#EE86AE', '#8566D8', '#F4E6B4', '#A6D6F0'],
	},
	// peach, rose, orchid, periwinkle
	about: {
		stops: ['#F2F2F0', '#F2F2F0', '#F4D9A6', '#EE8A8F', '#C27AD8', '#7A9CEB', '#B9D3F5'],
		blobs: ['#F09A9E', '#A46BD6', '#F6E0B0', '#BCD2F4'],
	},
	// mint, straw, rose, periwinkle
	writing: {
		stops: ['#F2F2F0', '#F2F2F0', '#A9E6CF', '#EAD98C', '#E78AB4', '#7F86E2', '#B8BEF2'],
		blobs: ['#E996BF', '#7C86DE', '#EDE2A0', '#9EE3CB'],
	},
	// sage, green, teal, lilac
	resume: {
		stops: ['#F2F2F0', '#F2F2F0', '#CBE9B5', '#7ACB98', '#4FA9B0', '#9586DE', '#B9BEE6'],
		blobs: ['#8BD3A4', '#8A7BD8', '#D7EEC0', '#9FD9C6'],
	},
};

// Dark hover previews: each section's hues as glowing bands.
export const DARK_SECTION_ACCENTS: typeof SECTION_ACCENTS = {
	projects: {
		stops: ['#121318', '#121318', '#6E5A2C', '#B84A74', '#6A4CC0', '#2C78B8', '#2A6E90'],
		blobs: ['#C25484', '#5A3EB0', '#6E5A34', '#2A7AA0'],
	},
	about: {
		stops: ['#121318', '#121318', '#70532E', '#B8505A', '#8A44A8', '#3A5EBC', '#3A5E96'],
		blobs: ['#C05A64', '#7038A8', '#705434', '#3C5E9E'],
	},
	writing: {
		stops: ['#121318', '#121318', '#22705A', '#7A5F2A', '#B04A7C', '#4448B8', '#4A50A0'],
		blobs: ['#B44E84', '#4248B4', '#72592E', '#22806A'],
	},
	resume: {
		stops: ['#121318', '#121318', '#3C6230', '#2A8456', '#1E7A84', '#5A48B8', '#4A4C90'],
		blobs: ['#2A7C5C', '#5444B0', '#3E6440', '#22806C'],
	},
};

// The idle film's palette lean while a nav item is hovered (idle geometry).
export function accentPalette(section: Exclude<FilmState, 'idle'>, layout: FilmLayout, scheme: Scheme = 'light'): Palette {
	const p = palette('idle', layout, 'drain', scheme);
	const c = (scheme === 'dark' ? DARK_SECTION_ACCENTS : SECTION_ACCENTS)[section];
	const colors = layout === 'mobile' ? c.stops.slice(1) : c.stops;
	return {
		...p,
		stops: p.stops.map((st, i) => ({ ...st, color: colors[i] })),
		blobs: p.blobs.map((b, i) => ({ ...b, color: c.blobs[i] })),
	};
}

// Drift order; the film loops through it.
export const IDLE_CYCLE: IdleVariant[] = ['drain', 'dusk', 'aurora', 'lagoon'];

// The mobile idle card has no flat band at the top: same colours minus the
// duplicated silver stop, at these positions.
const MOBILE_IDLE_AT = [0, 0.22, 0.45, 0.64, 0.82, 1];

export const FILM_STATES: FilmState[] = ['idle', 'about', 'projects', 'writing', 'resume'];

// `variant` only applies to the idle state; it defaults to Paper's Drain.
export function palette(state: FilmState, layout: FilmLayout, variant: IdleVariant = 'drain', scheme: Scheme = 'light'): Palette {
	const dark = scheme === 'dark';
	const table = dark ? DARK_COLORS : COLORS;
	const variants = dark ? DARK_IDLE_VARIANTS : IDLE_VARIANTS;
	const c = state === 'idle' ? { ...table.idle, ...variants[variant] } : table[state];
	const mobileIdle = state === 'idle' && layout === 'mobile';
	const colors = mobileIdle ? c.stops.slice(1) : c.stops;
	const at = mobileIdle ? MOBILE_IDLE_AT : c.at ?? WASH_AT;
	const tall = state === 'resume' && layout === 'desktop';
	const geometry = tall ? RESUME_GEOMETRY : GEOMETRY[layout][state === 'idle' ? 'idle' : 'expanded'];
	return {
		stops: colors.map((color, i) => ({ color, at: at[i] })),
		blobs: geometry.map((g, i) => ({ ...g, color: c.blobs[i] })),
		grain: state === 'idle' ? 1 : 0,
		ref: tall ? RESUME_H : 0,
	};
}

// Static CSS version of a palette (the exact Paper construction).
export function gradientCss(p: Palette): string {
	const stops = p.stops.map((s) => `${s.color} ${+(s.at * 100).toFixed(2)}%`).join(', ');
	return `linear-gradient(in oklab 180deg, ${stops})`;
}
