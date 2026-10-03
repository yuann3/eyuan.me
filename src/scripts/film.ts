// The film: a living gradient drawn with one fragment shader.
// It renders behind the panel content and never holds text. When WebGL is
// missing or the visitor prefers reduced motion, the static CSS fallback
// in Shell.astro stays visible instead.
//
// What moves:
// - Flow: domain-warped fbm bands whose warp advances visibly, plus a slow
//   (~8s) band oscillation. Calmer on the pale section washes.
// - Change: on idle the palette crossfades (in OKLab) through a family of
//   related palettes every ~12s. Section washes drift their hue slightly.
// - Pointer: the cursor swirls the bands around it (stronger on idle).
// - Events on `document`:
//     film:preview  { section: 'about'|'projects'|'writing'|'resume'|null }
//       leans the idle palette to that section's vivid accent over 300ms.
//     film:impulse  { x: 0..1, y: 0..1 }  (panel UV)
//       a brief swirl from that point. Navigation into a section triggers
//       one from the active nav item's side if nobody sent one.
// - Out: the idle family's current target hues go to `[data-shell]` as
//   --film-1..--film-4 (+ --film-fade) and a `film:palette` event, so the
//   headline and droplet can follow.
// - Scheme: follows `prefers-color-scheme`. A change at runtime tweens to
//   the other palette set (the navigation tween) and republishes the hues.

import { IDLE_CYCLE, accentPalette, filmHues, palette, type FilmLayout, type FilmState, type IdleVariant, type Palette, type Scheme } from './film-palettes';

const MAX_STOPS = 7;
const BLOBS = 4;
const RESOLUTION = 0.5; // fraction of device pixels

// Palette tween on navigation (beUI drawer range, ease-in-out).
const TWEEN_STATE_MS = 480; // idle <-> expanded, with the panel
const TWEEN_SWAP_MS = 450; // section -> section
// Idle family drift: hold, then crossfade to the next palette.
const FAMILY_HOLD_MS = 8500;
const FAMILY_FADE_MS = 3500;
// Nav hover preview.
const PREVIEW_MS = 300;
const PREVIEW_LEAN = 1; // all the way to the section's vivid accent
// Pointer swirl.
const POINTER_EASE_MS = 600; // in / out
const POINTER_FOLLOW_MS = 140; // position smoothing
const SWIRL_RADIUS = 0.18; // of the panel height
const SWIRL_IDLE = 0.85; // radians at the centre
const SWIRL_EXPANDED = 0.3;
// Navigation / film:impulse swirl.
const IMPULSE_MS = 1100;
const IMPULSE_RADIUS = 0.34;
const IMPULSE_STRENGTH = 1.1;
// Flow amplitude per state (1 = idle).
const FLOW_EXPANDED = 0.55;
// Section wash hue drift (radians of OKLab hue) and its period.
const WASH_HUE = 0.16;
const WASH_HUE_PERIOD = 16000;
// Frame rate: 60 while animating, 30 if frames run slow.
const FPS_FAST = 60;
const FPS_SLOW = 30;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 uSize;      // panel size in CSS px
uniform float uRef;      // height the stops and blobs are laid out against
uniform float uScale;    // device px per CSS px of the drawing buffer
uniform float uTime;
uniform float uFlow;     // flow amplitude (1 idle, lower on washes)
uniform float uHue;      // OKLab hue rotation, radians
uniform vec4 uSwirl[2];  // x, y (CSS px), strength (radians), radius (px)
uniform vec3 uStop[${MAX_STOPS}];  // oklab
uniform float uAt[${MAX_STOPS}];
uniform vec3 uBlob[${BLOBS}];      // oklab
uniform vec4 uRect[${BLOBS}];      // x, y, w, h (fractions)
uniform vec2 uSoft[${BLOBS}];      // blur px, opacity

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
	           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return v;
}

vec3 hueRotate(vec3 lab, float a) {
	float c = cos(a), s = sin(a);
	return vec3(lab.x, c * lab.y - s * lab.z, s * lab.y + c * lab.z);
}

vec3 oklabToSrgb(vec3 c) {
	float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
	float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
	float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
	float l = l_ * l_ * l_;
	float m = m_ * m_ * m_;
	float s = s_ * s_ * s_;
	vec3 lin = vec3(
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
	);
	lin = clamp(lin, 0.0, 1.0);
	return mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

// GLSL ES 1.0 has no tanh().
float tanh1(float x) {
	float e = exp(2.0 * clamp(x, -10.0, 10.0));
	return (e - 1.0) / (e + 1.0);
}

// Signed distance to a pill (rounded box with fully rounded ends).
float pill(vec2 p, vec2 size) {
	float r = min(size.x, size.y);
	vec2 q = abs(p) - size + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Rotate p around a centre, by an angle that fades out with distance.
vec2 swirl(vec2 p, vec4 s) {
	if (s.z == 0.0) return p;
	vec2 d = p - s.xy;
	float a = s.z * exp(-dot(d, d) / (s.w * s.w));
	float c = cos(a), n = sin(a);
	return s.xy + vec2(c * d.x - n * d.y, n * d.x + c * d.y);
}

void main() {
	vec2 px = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
	px = swirl(px, uSwirl[0]);
	px = swirl(px, uSwirl[1]);
	vec2 ref = vec2(uSize.x, uRef);
	vec2 uv = px / ref;
	float t = uTime;
	float tt = t * 0.2;

	// Domain warp: the warp offset advances, so the bands flow; a slow
	// travelling wave (8s) makes them visibly sway. Never churn.
	vec2 q = vec2(
		fbm(uv * vec2(1.4, 2.0) + vec2(0.0, tt)),
		fbm(uv * vec2(1.4, 2.0) + vec2(5.2, 1.3) - vec2(tt * 0.8, 0.0))
	);
	float w = fbm(uv * vec2(1.1, 1.6) + 1.8 * q + vec2(tt * 0.6, -tt * 0.4));
	float wave = sin(6.2831853 * t / 8.0 + uv.x * 2.4 + q.y * 3.0);
	float y = uv.y + uFlow * (0.12 * (w - 0.5) + 0.03 * wave);

	vec3 lab = uStop[0];
	for (int i = 1; i < ${MAX_STOPS}; i++) {
		float span = max(uAt[i] - uAt[i - 1], 0.0001);
		lab = mix(lab, uStop[i], clamp((y - uAt[i - 1]) / span, 0.0, 1.0));
	}
	vec3 col = oklabToSrgb(hueRotate(lab, uHue));

	for (int i = 0; i < ${BLOBS}; i++) {
		vec4 r = uRect[i];
		float fi = float(i);
		vec2 drift = vec2(sin(t * 0.50 + fi * 1.7), cos(t * 0.42 + fi * 2.3)) * vec2(0.05, 0.035) * uFlow;
		vec2 center = (r.xy + r.zw * 0.5 + drift) * ref;
		float d = pill(px - center, r.zw * 0.5 * ref);
		float sigma = max(uSoft[i].x, 1.0);
		float cover = 0.5 - 0.5 * tanh1(0.8 * d / sigma);
		col = mix(col, oklabToSrgb(hueRotate(uBlob[i], uHue)), cover * uSoft[i].y);
	}

	gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- colour helpers ----------

type Vec3 = [number, number, number];

function hexToSrgb(hex: string): Vec3 {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function hexToOklab(hex: string): Vec3 {
	const lin = hexToSrgb(hex).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const [r, g, b] = lin;
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];
}

// A palette flattened into the exact uniform arrays the shader reads.
// Colours are OKLab. `ref` is the palette's reference height in px
// (0 = the panel height).
type Frame = { stop: number[], at: number[], blob: number[], rect: number[], soft: number[], ref: number };

function toFrame(p: Palette): Frame {
	const stops = [...p.stops];
	while (stops.length < MAX_STOPS) stops.push({ ...stops[stops.length - 1], at: 1 });
	return {
		stop: stops.flatMap((s) => hexToOklab(s.color)),
		at: stops.map((s) => s.at),
		blob: p.blobs.flatMap((b) => hexToOklab(b.color)),
		rect: p.blobs.flatMap((b) => [b.x, b.y, b.w, b.h]),
		soft: p.blobs.flatMap((b) => [b.blur, b.opacity]),
		ref: p.ref,
	};
}

function mixFrame(a: Frame, b: Frame, k: number): Frame {
	if (k <= 0) return a;
	if (k >= 1) return b;
	const lerp = (x: number[], y: number[]) => x.map((v, i) => v + (y[i] - v) * k);
	return { stop: lerp(a.stop, b.stop), at: lerp(a.at, b.at), blob: lerp(a.blob, b.blob), rect: lerp(a.rect, b.rect), soft: lerp(a.soft, b.soft), ref: a.ref + (b.ref - a.ref) * k };
}

// Same, but colours travel in OKLCh (lightness and chroma lerp, hue on the
// shorter arc), so a crossfade between distant hues stays luminous instead
// of passing through grey.
function mixLch(x: number[], y: number[], k: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < x.length; i += 3) {
		const ca = Math.hypot(x[i + 1], x[i + 2]);
		const cb = Math.hypot(y[i + 1], y[i + 2]);
		let ha = Math.atan2(x[i + 2], x[i + 1]);
		let hb = Math.atan2(y[i + 2], y[i + 1]);
		// A near-grey end takes the other end's hue.
		if (ca < 0.02) ha = hb;
		if (cb < 0.02) hb = ha;
		let dh = hb - ha;
		if (dh > Math.PI) dh -= 2 * Math.PI;
		if (dh < -Math.PI) dh += 2 * Math.PI;
		const c = ca + (cb - ca) * k;
		const h = ha + dh * k;
		out.push(x[i] + (y[i] - x[i]) * k, c * Math.cos(h), c * Math.sin(h));
	}
	return out;
}

function mixFrameLch(a: Frame, b: Frame, k: number): Frame {
	if (k <= 0) return a;
	if (k >= 1) return b;
	return { ...mixFrame(a, b, k), stop: mixLch(a.stop, b.stop, k), blob: mixLch(a.blob, b.blob, k) };
}

// cubic-bezier(x1, y1, x2, y2) as a function of progress.
function bezier(x1: number, y1: number, x2: number, y2: number) {
	const at = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0, hi = 1, t = x;
		for (let i = 0; i < 20; i++) {
			t = (lo + hi) / 2;
			if (at(t, x1, x2) < x) lo = t; else hi = t;
		}
		return at(t, y1, y2);
	};
}

// beUI --ease-in-out: on-screen movement, like the panel morph.
const easeInOut = bezier(0.77, 0, 0.175, 1);
const smooth = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// ---------- the film ----------

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
	const sh = gl.createShader(type);
	if (!sh) return null;
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		console.warn('[film]', gl.getShaderInfoLog(sh));
		return null;
	}
	return sh;
}

type Section = Exclude<FilmState, 'idle'>;
const SECTIONS: Section[] = ['about', 'projects', 'writing', 'resume'];

function currentState(): FilmState {
	return (document.documentElement.dataset.section as FilmState | undefined) || 'idle';
}

const mobileQuery = window.matchMedia('(max-width: 767px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentLayout(): FilmLayout {
	return mobileQuery.matches ? 'mobile' : 'desktop';
}

function currentScheme(): Scheme {
	return darkQuery.matches ? 'dark' : 'light';
}

// Hand the idle family's hues to the rest of the page (headline, droplet).
function publishHues(variant: IdleVariant, fade: number) {
	const colors = filmHues(variant, currentScheme());
	const shell = document.querySelector<HTMLElement>('[data-shell]');
	if (shell) {
		colors.forEach((c, i) => shell.style.setProperty(`--film-${i + 1}`, c));
		shell.style.setProperty('--film-fade', `${fade}ms`);
	}
	document.dispatchEvent(new CustomEvent('film:palette', { detail: { variant, colors, duration: fade } }));
}

export function startFilm(panel: HTMLElement) {
	const canvas = panel.querySelector<HTMLCanvasElement>('[data-film-canvas]');
	if (!canvas) return;
	publishHues('drain', 0);
	// The static film only needs the hues; the WebGL film replaces this.
	let onScheme = () => publishHues('drain', 0);
	darkQuery.addEventListener('change', () => onScheme());
	if (reducedMotion.matches) return;

	const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
	if (!gl) return;

	const vs = compile(gl, gl.VERTEX_SHADER, VERT);
	const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
	const program = gl.createProgram();
	if (!vs || !fs || !program) return;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.warn('[film]', gl.getProgramInfoLog(program));
		return;
	}
	gl.useProgram(program);

	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const aPos = gl.getAttribLocation(program, 'aPos');
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

	const u = (name: string) => gl.getUniformLocation(program, name);
	const loc = {
		size: u('uSize'), ref: u('uRef'), scale: u('uScale'), time: u('uTime'),
		flow: u('uFlow'), hue: u('uHue'), swirl: u('uSwirl'),
		stop: u('uStop'), at: u('uAt'), blob: u('uBlob'), rect: u('uRect'), soft: u('uSoft'),
	};

	// ----- palettes -----

	let family: Frame[] = [];
	let washes = {} as Record<Section, Frame>;
	let accents = {} as Record<Section, Frame>;
	function buildPalettes() {
		const layout = currentLayout();
		const scheme = currentScheme();
		family = IDLE_CYCLE.map((v) => toFrame(palette('idle', layout, v, scheme)));
		washes = Object.fromEntries(SECTIONS.map((s) => [s, toFrame(palette(s, layout, 'drain', scheme))])) as Record<Section, Frame>;
		accents = Object.fromEntries(SECTIONS.map((s) => [s, toFrame(accentPalette(s, layout, scheme))])) as Record<Section, Frame>;
	}
	buildPalettes();

	const t0 = performance.now();
	const filmTime = (now: number) => Math.max(0, now - t0);

	// Idle family drift: hold FAMILY_HOLD_MS, crossfade FAMILY_FADE_MS.
	let familyIndex = -1;
	function familyFrame(now: number): Frame {
		const cycle = FAMILY_HOLD_MS + FAMILY_FADE_MS;
		const n = Math.floor(filmTime(now) / cycle);
		const into = filmTime(now) - n * cycle;
		const i = n % family.length;
		const j = (i + 1) % family.length;
		const k = smooth((into - FAMILY_HOLD_MS) / FAMILY_FADE_MS);
		// Announce each crossfade as it starts.
		const target = k > 0 ? j : i;
		if (target !== familyIndex) {
			familyIndex = target;
			publishHues(IDLE_CYCLE[target], familyIndex === 0 && n === 0 ? 0 : FAMILY_FADE_MS);
		}
		return mixFrameLch(family[i], family[j], k);
	}

	// Nav hover preview: one weight per section, each easing in or out.
	const lean: Record<Section, number> = { about: 0, projects: 0, writing: 0, resume: 0 };
	let previewSection: Section | null = null;
	let lastLeanAt = performance.now();
	function stepLean(now: number): boolean {
		const dt = Math.max(0, now - lastLeanAt);
		lastLeanAt = now;
		let moving = false;
		for (const s of SECTIONS) {
			const goal = s === previewSection && currentState() === 'idle' ? 1 : 0;
			if (lean[s] === goal) continue;
			const step = dt / PREVIEW_MS;
			lean[s] = goal > lean[s] ? Math.min(goal, lean[s] + step) : Math.max(goal, lean[s] - step);
			moving = true;
		}
		return moving;
	}
	function applyLean(base: Frame): Frame {
		let f = base;
		for (const s of SECTIONS) {
			if (lean[s] > 0) f = mixFrame(f, accents[s], PREVIEW_LEAN * easeInOut(lean[s]));
		}
		return f;
	}

	function targetFrame(now: number): Frame {
		const state = currentState();
		return state === 'idle' ? applyLean(familyFrame(now)) : washes[state];
	}

	// Navigation tween: from a snapshot of what was on screen to the live target.
	let from: Frame = targetFrame(performance.now());
	let shown = from;
	let tweenStart = -Infinity;
	let tweenMs = TWEEN_STATE_MS;

	// ----- pointer swirl + impulses -----

	// Client coordinates; mapped into canvas px each frame, because the film
	// layer is moved and scaled (FLIP) while the panel morphs.
	const pointer = { x: 0, y: 0, cx: 0, cy: 0, on: false, fresh: false, amount: 0 };
	function pointerTarget(): [number, number] {
		const r = canvas!.getBoundingClientRect();
		return [(pointer.cx - r.left) * width / Math.max(r.width, 1), (pointer.cy - r.top) * height / Math.max(r.height, 1)];
	}
	let impulse = { x: 0, y: 0, at: -Infinity };

	// ----- geometry -----

	let width = 0, height = 0, scale = 1;

	// Measured by a ResizeObserver, not per frame: no forced layout while
	// the panel animates.
	function resize() {
		scale = Math.min(window.devicePixelRatio || 1, 2) * RESOLUTION;
		const w = Math.max(1, Math.round(width * scale));
		const h = Math.max(1, Math.round(height * scale));
		if (canvas!.width !== w || canvas!.height !== h) {
			canvas!.width = w;
			canvas!.height = h;
		}
	}

	// A palette's reference height in px for the current panel.
	const refOf = (f: Frame) => Math.max(f.ref, height);

	let flow = currentState() === 'idle' ? 1 : FLOW_EXPANDED;
	let lastDraw = performance.now();

	function draw(now: number) {
		const dt = Math.min(100, Math.max(0, now - lastDraw));
		lastDraw = now;
		const idle = currentState() === 'idle';

		stepLean(now);
		const target = targetFrame(now);
		const k = Number.isNaN(tweenStart) ? 0 : Math.min(1, (now - tweenStart) / tweenMs);
		shown = k >= 1 ? target : mixFrame({ ...from, ref: refOf(from) }, { ...target, ref: refOf(target) }, easeInOut(k));

		// Flow and hue drift settle toward the state's level.
		flow += ((idle ? 1 : FLOW_EXPANDED) - flow) * (1 - Math.exp(-dt / 250));
		const hue = (1 - flow) / (1 - FLOW_EXPANDED) * WASH_HUE * Math.sin(2 * Math.PI * filmTime(now) / WASH_HUE_PERIOD);

		// Pointer: position follows, strength eases in/out (~600ms).
		const follow = 1 - Math.exp(-dt / (POINTER_FOLLOW_MS / 3));
		if (pointer.on) {
			const [tx, ty] = pointerTarget();
			// Enter where the pointer is; don't slide in from the last spot.
			if (pointer.fresh) { pointer.x = tx; pointer.y = ty; pointer.fresh = false; }
			pointer.x += (tx - pointer.x) * follow;
			pointer.y += (ty - pointer.y) * follow;
		}
		const goal = pointer.on ? (idle ? SWIRL_IDLE : SWIRL_EXPANDED) : 0;
		pointer.amount += (goal - pointer.amount) * (1 - Math.exp(-dt / (POINTER_EASE_MS / 3)));
		if (Math.abs(pointer.amount) < 1e-3 && !pointer.on) pointer.amount = 0;
		const breathe = 0.8 + 0.2 * Math.sin(filmTime(now) / 900);

		// Impulse: quick rise, gentle decay.
		const it = (now - impulse.at) / 1000;
		const env = it >= 0 && it < IMPULSE_MS / 1000 ? (1 - Math.exp(-it / 0.07)) * Math.exp(-it / 0.32) : 0;
		const impulseScale = idle ? 1 : 0.6;

		resize();
		gl!.viewport(0, 0, canvas!.width, canvas!.height);
		gl!.uniform2f(loc.size, width, height);
		gl!.uniform1f(loc.ref, refOf(shown));
		gl!.uniform1f(loc.scale, canvas!.width / Math.max(width, 1));
		gl!.uniform1f(loc.time, filmTime(now) / 1000);
		gl!.uniform1f(loc.flow, flow);
		gl!.uniform1f(loc.hue, hue);
		gl!.uniform4fv(loc.swirl, [
			pointer.x, pointer.y, pointer.amount * breathe, SWIRL_RADIUS * height,
			impulse.x * width, impulse.y * height, env * IMPULSE_STRENGTH * impulseScale, IMPULSE_RADIUS * height,
		]);
		gl!.uniform3fv(loc.stop, shown.stop);
		gl!.uniform1fv(loc.at, shown.at);
		gl!.uniform3fv(loc.blob, shown.blob);
		gl!.uniform4fv(loc.rect, shown.rect);
		gl!.uniform2fv(loc.soft, shown.soft);
		gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	}

	// ----- loop: 60fps, or 30 if frames run slow -----

	let raf = 0;
	let last = 0;
	let visible = true;
	let fps = FPS_FAST;
	let prevTick = 0;
	let window_ = { frames: 0, slow: 0, since: 0 };

	function budget(now: number) {
		// Watch rAF intervals outside tweens (navigation work is not the film's).
		if (fps !== FPS_FAST || now - tweenStart < tweenMs + 200) { prevTick = 0; return; }
		if (prevTick) {
			const gap = now - prevTick;
			if (gap < 250) {
				window_.frames++;
				if (gap > 1000 / FPS_FAST * 1.6) window_.slow++;
			}
		}
		prevTick = now;
		if (!window_.since) window_.since = now;
		if (now - window_.since > 2000) {
			if (window_.frames > 20 && window_.slow / window_.frames > 0.3) fps = FPS_SLOW;
			window_ = { frames: 0, slow: 0, since: now };
		}
	}

	function loop(now: number) {
		raf = requestAnimationFrame(loop);
		// Start on the frame the CSS transitions start, not when the swap ran.
		if (Number.isNaN(tweenStart)) tweenStart = now;
		budget(now);
		if (now - last < 1000 / fps - 2) return;
		last = now;
		draw(now);
	}

	function play() {
		if (!raf && visible && !document.hidden && !reducedMotion.matches) {
			lastDraw = lastLeanAt = performance.now();
			prevTick = 0;
			raf = requestAnimationFrame(loop);
		}
	}

	function pause() {
		cancelAnimationFrame(raf);
		raf = 0;
	}

	// ----- wiring -----

	const measure = () => {
		// Layout size, not the (possibly transformed) visual box.
		width = canvas.clientWidth;
		height = canvas.clientHeight;
	};
	measure();
	new ResizeObserver(([entry]) => {
		width = entry.contentRect.width;
		height = entry.contentRect.height;
		if (!raf) draw(performance.now());
	}).observe(canvas);

	draw(performance.now());
	panel.dataset.film = 'ready';
	play();

	document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
	new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		visible ? play() : pause();
	}).observe(panel);

	let navFromIdle = currentState() === 'idle';
	document.addEventListener('astro:before-swap', () => { navFromIdle = currentState() === 'idle'; });
	document.addEventListener('astro:after-swap', () => {
		const next = currentState();
		from = shown;
		tweenMs = next !== 'idle' && !navFromIdle ? TWEEN_SWAP_MS : TWEEN_STATE_MS;
		tweenStart = NaN;
		// A swirl from the active nav item's side, unless the page sent one.
		if (next !== 'idle' && performance.now() - impulse.at > 700 && !mobileQuery.matches) {
			const link = document.querySelector<HTMLElement>('[data-nav-link][aria-current]');
			const p = panel.getBoundingClientRect();
			if (link && p.height > 0) {
				const r = link.getBoundingClientRect();
				const y = (r.top + r.height / 2 - p.top) / p.height;
				impulse = { x: 0, y: Math.min(1, Math.max(0, y)), at: performance.now() };
			}
		}
		play();
	});

	// Pointer swirl (mouse and pen only).
	panel.addEventListener('pointermove', (e) => {
		if (e.pointerType === 'touch') return;
		pointer.cx = e.clientX;
		pointer.cy = e.clientY;
		if (!pointer.on) {
			pointer.on = true;
			pointer.fresh = pointer.amount === 0;
		}
	}, { passive: true });
	panel.addEventListener('pointerleave', () => { pointer.on = false; });

	document.addEventListener('film:preview', (e) => {
		const s = (e as CustomEvent<{ section?: string | null }>).detail?.section;
		previewSection = s && (SECTIONS as string[]).includes(s) ? s as Section : null;
	});

	document.addEventListener('film:impulse', (e) => {
		const d = (e as CustomEvent<{ x?: number, y?: number }>).detail;
		if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') return;
		impulse = { x: Math.min(1, Math.max(0, d.x)), y: Math.min(1, Math.max(0, d.y)), at: performance.now() };
	});

	// Light <-> dark: tween from what is on screen to the other set, like a
	// navigation, and hand the page the new hues over the same time.
	onScheme = () => {
		buildPalettes();
		from = shown;
		tweenMs = TWEEN_STATE_MS;
		tweenStart = NaN;
		publishHues(IDLE_CYCLE[Math.max(0, familyIndex)], TWEEN_STATE_MS);
		play();
	};

	mobileQuery.addEventListener('change', () => {
		buildPalettes();
		shown = from = targetFrame(performance.now());
		tweenStart = -Infinity;
	});

	// Reduced motion switched on at runtime: back to the static fallback.
	reducedMotion.addEventListener('change', () => {
		if (reducedMotion.matches) {
			pause();
			delete panel.dataset.film;
		} else {
			panel.dataset.film = 'ready';
			play();
		}
	});

	canvas.addEventListener('webglcontextlost', (e) => {
		e.preventDefault();
		pause();
		delete panel.dataset.film;
	});
}
