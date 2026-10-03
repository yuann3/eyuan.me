// Film palettes, taken from the Paper artboards ("v2 — simple").
// Shared by the WebGL film (src/scripts/film.ts) and the static CSS
// fallback that Shell.astro renders from the same data.

export type FilmState = 'idle' | 'about' | 'projects' | 'writing' | 'resume';
export type FilmLayout = 'desktop' | 'mobile';

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

// Drift order; the film loops through it.
export const IDLE_CYCLE: IdleVariant[] = ['drain', 'dusk', 'aurora', 'lagoon'];

// The mobile idle card has no flat band at the top: same colours minus the
// duplicated silver stop, at these positions.
const MOBILE_IDLE_AT = [0, 0.22, 0.45, 0.64, 0.82, 1];

export const FILM_STATES: FilmState[] = ['idle', 'about', 'projects', 'writing', 'resume'];

// `variant` only applies to the idle state; it defaults to Paper's Drain.
export function palette(state: FilmState, layout: FilmLayout, variant: IdleVariant = 'drain'): Palette {
	const c = state === 'idle' ? { ...COLORS.idle, ...IDLE_VARIANTS[variant] } : COLORS[state];
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
