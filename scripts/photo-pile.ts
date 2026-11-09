// Random layout, entrance and drag for the photo pile, which its Sidecar
// script loads once the pile scrolls into view. See the component comment
// for the two modes; the mode itself comes from CSS (--pile-mode).

const MAX_COVER = 0.3; // under the 35% ceiling, with room for the rotation
const ROT = 8; // scatter rotation, ± degrees
const TILT = 3; // row tilt, ± degrees
const STAGGER = 70;

type Item = {
	el: HTMLElement;
	cw: number; // caption text width
	r: number; // degrees
	u: number; // centre, as a fraction of the free range (0..1)
	v: number;
};

type Pile = {
	root: HTMLElement;
	stage: HTMLElement;
	items: Item[];
	top: number; // highest z so far
	placed: boolean; // a scatter layout has been computed
	shown: boolean; // the entrance has run
};

const piles = new WeakMap<HTMLElement, Pile>();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const isScatter = (p: Pile) => getComputedStyle(p.root).getPropertyValue('--pile-mode').trim() === 'scatter';

function shuffle<T>(a: T[]): T[] {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// A random angle within ±max, never nearly straight, signs not all equal.
function angles(n: number, max: number, min: number) {
	const out = Array.from({ length: n }, () => rand(min, max) * (Math.random() < 0.5 ? -1 : 1));
	if (out.every((a) => Math.sign(a) === Math.sign(out[0]))) out[Math.floor(Math.random() * n)] *= -1;
	return out;
}

// ---------- geometry ----------

type Box = { x: number; y: number; w: number; h: number; cw?: number };

function size(el: HTMLElement) {
	return { w: el.offsetWidth, h: el.offsetHeight };
}

// Half extents of the rotated print's bounding box.
function extent(w: number, h: number, deg: number) {
	const a = (Math.abs(deg) * Math.PI) / 180;
	const c = Math.cos(a), s = Math.sin(a);
	return { ex: (w * c + h * s) / 2, ey: (w * s + h * c) / 2 };
}

function centre(W: number, H: number, w: number, h: number, deg: number, u: number, v: number) {
	const { ex, ey } = extent(w, h, deg);
	const cx = W - 2 * ex > 0 ? ex + u * (W - 2 * ex) : W / 2;
	const cy = H - 2 * ey > 0 ? ey + v * (H - 2 * ey) : H / 2;
	return { cx, cy };
}

function boxes(p: Pile, W: number, H: number, uv?: { u: number; v: number }[]): Box[] {
	return p.items.map((it, i) => {
		const { w, h } = size(it.el);
		const { u, v } = uv ? uv[i] : it;
		const { cx, cy } = centre(W, H, w, h, it.r, u, v);
		return { x: cx - w / 2, y: cy - h / 2, w, h, cw: it.cw };
	});
}

function overlap(a: Box, b: Box) {
	const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
	const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
	return x > 0 && y > 0 ? x * y : 0;
}

const CAP_H = 30; // the caption strip at the bottom of each frame
const MAX_CAP_COVER = 0.04; // captions stay readable

// The worst coverage of any print by the prints stacked above it, as a
// fraction of the cover limit (> 1 fails). Captions must stay readable too.
function worstCover(b: Box[], z: number[], limit = MAX_COVER) {
	let worst = 0;
	for (let i = 0; i < b.length; i++) {
		// The caption's text, with a margin for the rotation.
		const cap = { x: b[i].x, y: b[i].y + b[i].h - CAP_H - 6, w: Math.min(b[i].w, (b[i].cw ?? b[i].w) + 24), h: CAP_H + 12 };
		let covered = 0, capCovered = 0;
		for (let j = 0; j < b.length; j++) {
			if (z[j] <= z[i]) continue;
			covered += overlap(b[i], b[j]);
			capCovered += overlap(cap, b[j]);
		}
		worst = Math.max(worst, covered / (b[i].w * b[i].h) / limit, capCovered / (cap.w * cap.h) / MAX_CAP_COVER);
	}
	return worst;
}

// Rejection sampling: draw valid layouts and keep the one where every
// print's nearest neighbour sits closest to a comfortable distance, so the
// prints read as one loose pile rather than four islands or a heap.
function sample(p: Pile, W: number, H: number, z: number[], limit: number) {
	let best: { u: number; v: number }[] | null = null;
	let bestScore = Infinity;
	let found = 0;
	for (let tries = 0; tries < 1200 && found < 16; tries++) {
		const uv = p.items.map(() => ({ u: Math.random(), v: Math.random() }));
		const b = boxes(p, W, H, uv);
		if (worstCover(b, z, limit) > 1) continue;
		found++;
		const d0 = 0.92 * (b.reduce((s, x) => s + Math.min(x.w, x.h), 0) / b.length);
		const nn = b.map((a, i) =>
			Math.min(...b.filter((_, j) => j !== i).map((c) => Math.hypot(a.x + a.w / 2 - c.x - c.w / 2, a.y + a.h / 2 - c.y - c.h / 2))),
		);
		const score = Math.abs(Math.min(...nn) - d0) + 0.5 * nn.reduce((s, d) => s + Math.abs(d - d0), 0) / nn.length;
		if (score < bestScore) {
			bestScore = score;
			best = uv;
		}
	}
	return best;
}

function zOf(p: Pile) {
	return p.items.map((it) => Number(it.el.style.getPropertyValue('--z')) || 0);
}

function apply(p: Pile) {
	const W = p.stage.clientWidth, H = p.stage.clientHeight;
	const b = boxes(p, W, H);
	p.items.forEach((it, i) => {
		it.el.style.setProperty('--x', `${b[i].x.toFixed(1)}px`);
		it.el.style.setProperty('--y', `${b[i].y.toFixed(1)}px`);
	});
}

// Find a scatter layout. Shrinks the prints a little, then relaxes the
// cover limit, before it gives up and keeps the current positions.
function layout(p: Pile, fresh: boolean) {
	const W = p.stage.clientWidth, H = p.stage.clientHeight;
	const z = zOf(p);
	if (!fresh) {
		// Keep the arrangement when it still works at the new size.
		p.stage.style.setProperty('--k', '1');
		if (worstCover(boxes(p, W, H), z, MAX_COVER + 0.05) <= 1) return apply(p);
	}
	for (const limit of [MAX_COVER, 0.45]) {
		for (const k of [1, 0.94, 0.88, 0.82, 0.76]) {
			p.stage.style.setProperty('--k', String(k));
			const uv = sample(p, W, H, z, limit);
			if (uv) {
				p.items.forEach((it, i) => Object.assign(it, uv[i]));
				return apply(p);
			}
		}
	}
	apply(p);
}

function setRotations(p: Pile) {
	const r = angles(p.items.length, ROT, 2);
	const t = angles(p.items.length, TILT, 1);
	p.items.forEach((it, i) => {
		it.r = r[i];
		it.el.style.setProperty('--r', `${r[i].toFixed(2)}deg`);
		it.el.style.setProperty('--t', `${t[i].toFixed(2)}deg`);
	});
}

function setOrder(p: Pile) {
	const z = shuffle(p.items.map((_, i) => i + 1));
	p.items.forEach((it, i) => it.el.style.setProperty('--z', String(z[i])));
	p.top = p.items.length;
}

// ---------- entrance ----------

// How long until the text in this content layer has finished revealing.
function textRemaining(content: HTMLElement, pile: HTMLElement) {
	let end = -1;
	for (const a of content.getAnimations({ subtree: true })) {
		if (!(a instanceof CSSAnimation) || !/^rv-(in|fade)$/.test(a.animationName)) continue;
		const target = (a.effect as KeyframeEffect | null)?.target;
		if (target instanceof Node && pile.contains(target)) continue;
		const t = a.effect?.getComputedTiming();
		if (!t) continue;
		end = Math.max(end, Number(t.endTime ?? 0) - Number(t.localTime ?? 0));
	}
	return end < 0 ? 300 : end;
}

function drop(p: Pile, base: number) {
	const r = reduced();
	const order = [...p.items].sort(
		(a, b) => Number(a.el.style.getPropertyValue('--z')) - Number(b.el.style.getPropertyValue('--z')),
	);
	order.forEach((it, n) => {
		const el = it.el;
		const scatter = isScatter(p);
		const rot = scatter ? it.r : parseFloat(el.style.getPropertyValue('--t')) || 0;
		// Extra turn in the direction it already leans.
		const extra = (scatter ? rand(3, 6) : rand(1.5, 3)) * (Math.sign(rot) || 1);
		el.style.setProperty('--from-r', `${(rot + extra).toFixed(2)}deg`);
		el.style.setProperty('--delay', `${Math.round(base + (r ? n * 30 : n * STAGGER))}ms`);
		el.dataset.st = 'drop';
		const done = (e: AnimationEvent) => {
			if (e.target !== el || !/^pile-(drop|fade)$/.test(e.animationName)) return;
			el.removeEventListener('animationend', done);
			el.removeEventListener('animationcancel', done);
			delete el.dataset.st;
		};
		el.addEventListener('animationend', done);
		el.addEventListener('animationcancel', done);
	});
	p.shown = true;
}

// Let decoded images drop, not empty frames, but never wait long.
function decoded(p: Pile, ms: number) {
	const imgs = p.items.map((it) => it.el.querySelector('img')).filter((i): i is HTMLImageElement => !!i);
	return Promise.race([
		Promise.all(imgs.map((i) => i.decode().catch(() => {}))),
		new Promise((r) => setTimeout(r, ms)),
	]);
}

async function enterNow(p: Pile, content: HTMLElement) {
	const start = performance.now() + Math.max(0, textRemaining(content, p.root) - 80);
	for (const it of p.items) {
		it.el.dataset.st = 'wait';
		const img = it.el.querySelector('img');
		if (img) img.loading = 'eager';
	}
	p.root.dataset.ready = '';
	await decoded(p, 700);
	drop(p, Math.max(0, start - performance.now()));
}

// Row mode: the pile sits below the text, so drop it in when it scrolls in.
function enterOnScroll(p: Pile, content: HTMLElement) {
	for (const it of p.items) it.el.dataset.st = 'wait';
	p.root.dataset.ready = '';
	const io = new IntersectionObserver((entries) => {
		if (!entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.15) || !p.root.isConnected) return;
		io.disconnect();
		drop(p, 0);
	}, { root: content, threshold: [0, 0.15, 0.3] });
	io.observe(p.root);
}

// ---------- drag (scatter, mouse and pen) ----------

function bindDrag(p: Pile) {
	p.root.toggleAttribute('data-drag-on', true);
	for (const it of p.items) {
		const el = it.el;
		el.addEventListener('pointerdown', (e) => {
			if (e.button !== 0 || e.pointerType === 'touch' || !isScatter(p)) return;
			e.preventDefault();
			const W = p.stage.clientWidth, H = p.stage.clientHeight;
			const { w, h } = size(el);
			const { ex, ey } = extent(w, h, it.r);
			const sx = e.clientX, sy = e.clientY;
			const c0 = centre(W, H, w, h, it.r, it.u, it.v);
			let moved = false;
			let last = { x: sx, y: sy, t: e.timeStamp }, vel = { x: 0, y: 0 };
			el.setPointerCapture(e.pointerId);
			el.dataset.press = '';

			const place = (cx: number, cy: number) => {
				const rx = W - 2 * ex, ry = H - 2 * ey;
				it.u = rx > 0 ? Math.min(1, Math.max(0, (cx - ex) / rx)) : 0.5;
				it.v = ry > 0 ? Math.min(1, Math.max(0, (cy - ey) / ry)) : 0.5;
				const c = centre(W, H, w, h, it.r, it.u, it.v);
				el.style.setProperty('--x', `${(c.cx - w / 2).toFixed(1)}px`);
				el.style.setProperty('--y', `${(c.cy - h / 2).toFixed(1)}px`);
			};

			const move = (m: PointerEvent) => {
				const dx = m.clientX - sx, dy = m.clientY - sy;
				if (!moved) {
					if (Math.hypot(dx, dy) < 3) return;
					moved = true;
					delete el.dataset.press;
					el.dataset.drag = '';
					el.style.setProperty('--z', String(++p.top));
				}
				const dt = Math.max(1, m.timeStamp - last.t);
				vel = { x: (m.clientX - last.x) / dt, y: (m.clientY - last.y) / dt };
				last = { x: m.clientX, y: m.clientY, t: m.timeStamp };
				place(c0.cx + dx, c0.cy + dy);
			};

			const up = (u: PointerEvent) => {
				el.removeEventListener('pointermove', move);
				el.removeEventListener('pointerup', up);
				el.removeEventListener('pointercancel', up);
				delete el.dataset.press;
				if (!moved) return;
				delete el.dataset.drag;
				// A short glide in the throw direction, then it settles.
				if (!reduced() && u.timeStamp - last.t < 80) {
					const glide = 90; // ms of travel at release speed
					const gx = Math.max(-28, Math.min(28, vel.x * glide));
					const gy = Math.max(-28, Math.min(28, vel.y * glide));
					const cur = centre(W, H, w, h, it.r, it.u, it.v);
					place(cur.cx + gx, cur.cy + gy);
				}
			};

			el.addEventListener('pointermove', move);
			el.addEventListener('pointerup', up);
			el.addEventListener('pointercancel', up);
		});
	}
}

// ---------- setup ----------

// Fill the visible panel below the pile's top (most of the bottom padding
// too); CSS keeps it at least as tall as the text.
function fitHeight(p: Pile, content: HTMLElement) {
	const pb = parseFloat(getComputedStyle(content).paddingBottom) || 0;
	const top = p.root.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
	const h = Math.round(content.clientHeight - pb + Math.min(32, pb - 16) - top);
	p.root.style.setProperty('--pile-h', `${Math.max(420, h)}px`);
}

function setup(root: HTMLElement) {
	const content = root.closest<HTMLElement>('[data-panel-content]');
	const stage = root.querySelector<HTMLElement>('[data-pile-stage]');
	if (!content || !stage) return;
	root.dataset.init = '';
	const items: Item[] = [...stage.querySelectorAll<HTMLElement>('[data-photo]')].map((el) => {
		const cap = el.querySelector('figcaption');
		// Geist Mono 10px: ~6.2px per character.
		return { el, cw: (cap?.textContent?.trim().length ?? 0) * 6.2, r: 0, u: 0.5, v: 0.5 };
	});
	const p: Pile = { root, stage, items, top: items.length, placed: false, shown: false };
	piles.set(root, p);

	setOrder(p);
	setRotations(p);
	if (isScatter(p)) {
		fitHeight(p, content);
		layout(p, true);
		p.placed = true;
		enterNow(p, content);
	} else {
		enterOnScroll(p, content);
	}
	bindDrag(p);
}

export function boot() {
	const root = document.querySelector<HTMLElement>('[data-panel-content] [data-pile]');
	if (!root || root.hasAttribute('data-init')) return;
	// Cold load: let the shell start its reveal first, so we can follow it.
	if (document.body.hasAttribute('data-boot')) {
		requestAnimationFrame(boot);
		return;
	}
	setup(root);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = window.setTimeout(() => {
		const root = document.querySelector<HTMLElement>('[data-panel-content] [data-pile]');
		const p = root && piles.get(root);
		const content = root?.closest<HTMLElement>('[data-panel-content]');
		if (!p || !content) return;
		if (!isScatter(p)) return;
		fitHeight(p, content);
		layout(p, !p.placed);
		p.placed = true;
		if (!p.shown) drop(p, 0);
	}, 160);
});

