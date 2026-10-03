// The film: a slow, breathing gradient drawn with one fragment shader.
// It renders behind the panel content and never holds text. When WebGL is
// missing or the visitor prefers reduced motion, the static CSS fallback
// in Shell.astro stays visible instead.

import { palette, type FilmLayout, type FilmState, type Palette } from './film-palettes';

const MAX_STOPS = 7;
const BLOBS = 4;
const TWEEN_MS = 450;
const IDLE_FPS = 30;
const RESOLUTION = 0.5; // fraction of device pixels

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
uniform vec3 uStop[${MAX_STOPS}];  // oklab
uniform float uAt[${MAX_STOPS}];
uniform vec3 uBlob[${BLOBS}];      // sRGB
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

void main() {
	vec2 px = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
	vec2 ref = vec2(uSize.x, uRef);
	vec2 uv = px / ref;
	float t = uTime;

	// Domain warp: bands drift and breathe, they never churn.
	vec2 q = vec2(
		fbm(uv * vec2(1.4, 2.0) + vec2(0.0, t * 0.020)),
		fbm(uv * vec2(1.4, 2.0) + vec2(5.2, 1.3) - vec2(t * 0.015, 0.0))
	);
	float y = uv.y + 0.07 * (fbm(uv * vec2(1.1, 1.6) + 1.6 * q + t * 0.012) - 0.5);

	vec3 lab = uStop[0];
	for (int i = 1; i < ${MAX_STOPS}; i++) {
		float span = max(uAt[i] - uAt[i - 1], 0.0001);
		lab = mix(lab, uStop[i], clamp((y - uAt[i - 1]) / span, 0.0, 1.0));
	}
	vec3 col = oklabToSrgb(lab);

	for (int i = 0; i < ${BLOBS}; i++) {
		vec4 r = uRect[i];
		float fi = float(i);
		vec2 drift = vec2(sin(t * 0.07 + fi * 1.7), cos(t * 0.05 + fi * 2.3)) * vec2(0.035, 0.025);
		vec2 center = (r.xy + r.zw * 0.5 + drift) * ref;
		float d = pill(px - center, r.zw * 0.5 * ref);
		float sigma = max(uSoft[i].x, 1.0);
		float cover = 0.5 - 0.5 * tanh1(0.8 * d / sigma);
		col = mix(col, uBlob[i], cover * uSoft[i].y);
	}

	gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- colour helpers ----------

function hexToSrgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function hexToOklab(hex: string): [number, number, number] {
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
// `ref` is the palette's reference height in px (0 = the panel height).
type Frame = { stop: number[], at: number[], blob: number[], rect: number[], soft: number[], ref: number };

function toFrame(p: Palette): Frame {
	const stops = [...p.stops];
	while (stops.length < MAX_STOPS) stops.push({ ...stops[stops.length - 1], at: 1 });
	return {
		stop: stops.flatMap((s) => hexToOklab(s.color)),
		at: stops.map((s) => s.at),
		blob: p.blobs.flatMap((b) => hexToSrgb(b.color)),
		rect: p.blobs.flatMap((b) => [b.x, b.y, b.w, b.h]),
		soft: p.blobs.flatMap((b) => [b.blur, b.opacity]),
		ref: p.ref,
	};
}

function mixFrame(a: Frame, b: Frame, k: number): Frame {
	const lerp = (x: number[], y: number[]) => x.map((v, i) => v + (y[i] - v) * k);
	return { stop: lerp(a.stop, b.stop), at: lerp(a.at, b.at), blob: lerp(a.blob, b.blob), rect: lerp(a.rect, b.rect), soft: lerp(a.soft, b.soft), ref: a.ref + (b.ref - a.ref) * k };
}

// cubic-bezier(0.2, 0, 0, 1), the site's one easing curve. The wash blends
// in step with the panel geometry (Paper's 02 frame: half way, half pale).
function ease(x: number): number {
	let lo = 0, hi = 1, t = x;
	for (let i = 0; i < 20; i++) {
		t = (lo + hi) / 2;
		const bx = 3 * (1 - t) * (1 - t) * t * 0.2 + t * t * t;
		if (bx < x) lo = t; else hi = t;
	}
	return 3 * (1 - t) * t * t + t * t * t;
}

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

function currentState(): FilmState {
	return (document.documentElement.dataset.section as FilmState | undefined) || 'idle';
}

const mobileQuery = window.matchMedia('(max-width: 767px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function currentLayout(): FilmLayout {
	return mobileQuery.matches ? 'mobile' : 'desktop';
}

export function startFilm(panel: HTMLElement) {
	const canvas = panel.querySelector<HTMLCanvasElement>('[data-film-canvas]');
	if (!canvas || reducedMotion.matches) return;

	const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
	if (!gl) return;

	const vs = compile(gl, gl.VERTEX_SHADER, VERT);
	const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
	const program = gl.createProgram();
	if (!vs || !fs || !program) return;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
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
		stop: u('uStop'), at: u('uAt'), blob: u('uBlob'), rect: u('uRect'), soft: u('uSoft'),
	};

	let from = toFrame(palette(currentState(), currentLayout()));
	let to = from;
	let shown = from;
	let tweenStart = -Infinity;
	let width = 0, height = 0, scale = 1;
	let raf = 0;
	let last = 0;
	let visible = true;
	const t0 = performance.now();

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

	function draw(now: number) {
		const k = Number.isNaN(tweenStart) ? 0 : Math.min(1, (now - tweenStart) / TWEEN_MS);
		shown = k >= 1 ? to : mixFrame({ ...from, ref: refOf(from) }, { ...to, ref: refOf(to) }, ease(k));
		resize();
		gl!.viewport(0, 0, canvas!.width, canvas!.height);
		gl!.uniform2f(loc.size, width, height);
		gl!.uniform1f(loc.ref, refOf(shown));
		gl!.uniform1f(loc.scale, canvas!.width / Math.max(width, 1));
		gl!.uniform1f(loc.time, (now - t0) / 1000);
		gl!.uniform3fv(loc.stop, shown.stop);
		gl!.uniform1fv(loc.at, shown.at);
		gl!.uniform3fv(loc.blob, shown.blob);
		gl!.uniform4fv(loc.rect, shown.rect);
		gl!.uniform2fv(loc.soft, shown.soft);
		gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	}

	function loop(now: number) {
		raf = requestAnimationFrame(loop);
		// Start on the frame the CSS transitions start, not when the swap ran.
		if (Number.isNaN(tweenStart)) tweenStart = now;
		// Full rate during a tween, ~30fps while the film just breathes.
		const tweening = now - tweenStart < TWEEN_MS;
		if (!tweening && now - last < 1000 / IDLE_FPS - 2) return;
		last = now;
		draw(now);
	}

	function play() {
		if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
	}

	function pause() {
		cancelAnimationFrame(raf);
		raf = 0;
	}

	function retarget() {
		from = shown;
		to = toFrame(palette(currentState(), currentLayout()));
		tweenStart = NaN;
	}

	const measure = () => {
		const rect = canvas.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
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
	document.addEventListener('astro:after-swap', retarget);
	mobileQuery.addEventListener('change', () => {
		shown = to = from = toFrame(palette(currentState(), currentLayout()));
	});
	canvas.addEventListener('webglcontextlost', (e) => {
		e.preventDefault();
		pause();
		delete panel.dataset.film;
	});
}
