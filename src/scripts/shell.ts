// Client side of Shell.astro.
//
// Navigation between shell pages uses Astro's <ClientRouter /> with a custom
// swap: the shell (left column, panel, film canvas) is never replaced. We copy
// the new <html> attributes (data-state / data-section drive the CSS), swap
// <head>, update the nav, and replace only the panel content.
//
// Motion (beUI, see motion-spec.md and motion-api.md):
// - The layout changes instantly. The panel's visible area then morphs from
//   its old box to the new one with clip-path (surface first), and the film
//   layer follows with a matching translate+scale, so neither the canvas nor
//   the content relayouts per frame. Collapsing holds the wide geometry
//   (`.shell[data-geo="wide"]`) until the clip reaches the idle box.
// - Content exits in 120ms; new content reveals from ~60% of an expansion,
//   or after the exit on a section swap.
// - Esc closes an expanded panel, with a floating hint.

import { navigate, swapFunctions } from 'astro:transitions/client';
import { startFilm } from './film';
import { enter, play, unobserve } from './motion-reveal';

type State = 'idle' | 'expanded';
type Box = { top: number, left: number, width: number, height: number };

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const EXPAND_MS = 480;
const COLLAPSE_MS = 450;
const EXIT_MS = 120;
const HINT_DELAY_MS = 300;
const HINT_IDLE_MS = 4000;
const RADIUS = 20;

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceQuery.matches;

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const state = (): State => (document.documentElement.dataset.state === 'expanded' ? 'expanded' : 'idle');

// ---------- panel morph (clip-path + FLIP) ----------

let morphAnims: Animation[] = [];
let morphToken = 0;

function boxOf(el: Element): Box {
	const r = el.getBoundingClientRect();
	return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// The panel's visible box: its layout box minus the current clip insets.
function visualBox(panel: HTMLElement): Box {
	const b = boxOf(panel);
	const clip = getComputedStyle(panel).clipPath;
	const m = /inset\(([^)]*)\)/.exec(clip || '');
	if (!m) return b;
	const px = m[1].split('round')[0].trim().split(/\s+/).map((v) => parseFloat(v) || 0);
	const [t, r = t, btm = t, l = r] = px;
	return { top: b.top + t, left: b.left + l, width: b.width - l - r, height: b.height - t - btm };
}

const near = (a: Box, b: Box) =>
	Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 &&
	Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

// Insets of `b` inside the layout box `L`.
function insets(b: Box, L: Box) {
	return {
		top: b.top - L.top,
		right: L.left + L.width - (b.left + b.width),
		bottom: L.top + L.height - (b.top + b.height),
		left: b.left - L.left,
	};
}

const clipOf = (b: Box, L: Box) => {
	const i = insets(b, L);
	return `inset(${i.top}px ${i.right}px ${i.bottom}px ${i.left}px round ${RADIUS}px)`;
};

const filmTransformOf = (b: Box, L: Box) =>
	`translate(${b.left - L.left}px, ${b.top - L.top}px) scale(${b.width / L.width}, ${b.height / L.height})`;

function stopMorph() {
	morphToken++;
	for (const a of morphAnims) a.cancel();
	morphAnims = [];
	const shell = $('[data-shell]');
	if (shell) delete shell.dataset.geo;
}

function morphEvent(phase: 'start' | 'end', from: State, to: State) {
	document.dispatchEvent(new CustomEvent('shell:morph', { detail: { phase, from, to } }));
}

// Change the layout with `apply`, then morph the panel's visible box from
// where it was to where it now is.
function morph(apply: () => void, from: State) {
	const shell = $('[data-shell]');
	const panel = $('[data-panel]');
	if (!shell || !panel) return apply();
	const first = visualBox(panel);
	stopMorph();
	apply();
	const to = state();
	if (reduced()) return;

	const target = boxOf(panel);
	if (near(first, target)) return;
	shell.dataset.geo = 'wide';
	const L = boxOf(panel);
	if (L.width < 1 || L.height < 1) return stopMorph();

	const collapsing = to === 'idle';
	const opts: KeyframeAnimationOptions = {
		duration: collapsing ? COLLAPSE_MS : EXPAND_MS,
		easing: EASE_IN_OUT,
		fill: 'both',
	};
	const film = panel.querySelector<HTMLElement>('[data-film-layer]');
	const edge = panel.querySelector<HTMLElement>('[data-panel-edge]');
	const a = insets(first, L);
	const b = insets(target, L);

	morphAnims = [panel.animate({ clipPath: [clipOf(first, L), clipOf(target, L)] }, opts)];
	if (film) morphAnims.push(film.animate({ transform: [filmTransformOf(first, L), filmTransformOf(target, L)] }, opts));
	if (edge) {
		morphAnims.push(edge.animate({
			top: [`${a.top}px`, `${b.top}px`],
			right: [`${a.right}px`, `${b.right}px`],
			bottom: [`${a.bottom}px`, `${b.bottom}px`],
			left: [`${a.left}px`, `${b.left}px`],
		}, opts));
	}

	const token = morphToken;
	morphEvent('start', from, to);
	morphAnims[0].finished.then(() => {
		if (token !== morphToken) return;
		stopMorph();
		morphEvent('end', from, to);
	}, () => {});
}

// ---------- nav ----------

function syncNav(path: string) {
	for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')) {
		const active = link.dataset.section === document.documentElement.dataset.section;
		if (active) link.setAttribute('aria-current', link.pathname === path ? 'page' : 'true');
		else link.removeAttribute('aria-current');
	}
}

let previewing: string | null = null;

function preview(section: string | null) {
	if (section === previewing) return;
	previewing = section;
	document.dispatchEvent(new CustomEvent('film:preview', { detail: { section } }));
}

function bindNav() {
	for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')) {
		if (link.dataset.motionBound) continue;
		link.dataset.motionBound = '1';
		const section = link.dataset.section ?? null;
		link.addEventListener('pointerenter', (e) => {
			if (e.pointerType !== 'touch' && state() === 'idle') preview(section);
		});
		link.addEventListener('pointerleave', (e) => {
			if (e.pointerType !== 'touch' && state() === 'idle') preview(null);
		});
		link.addEventListener('focus', () => { if (state() === 'idle' && link.matches(':focus-visible')) preview(section); });
		link.addEventListener('blur', () => { if (state() === 'idle') preview(null); });
		link.addEventListener('click', (e) => {
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
			const panel = $('[data-panel]');
			if (!panel) return;
			const p = visualBox(panel);
			const r = link.getBoundingClientRect();
			const clamp = (v: number) => Math.min(1, Math.max(0, v));
			document.dispatchEvent(new CustomEvent('film:impulse', {
				detail: {
					x: clamp((r.left + r.width / 2 - p.left) / p.width),
					y: clamp((r.top + r.height / 2 - p.top) / p.height),
				},
			}));
		});
	}
}

// ---------- the rail's intro ----------

const introItems = () => [...document.querySelectorAll<HTMLElement>('.intro [data-reveal]')];

// ---------- Esc hint ----------

let hintTimer = 0;
let pointerNear = false;

function hintEl() {
	return $('[data-esc-hint]');
}

function hintOn(delay = 0) {
	const hint = hintEl();
	if (!hint) return;
	const fresh = !hint.dataset.hint || hint.dataset.hint === 'out';
	if (fresh) hint.style.setProperty('--hint-delay', `${delay}ms`);
	hint.dataset.hint = 'on';
	clearTimeout(hintTimer);
	hintTimer = window.setTimeout(() => {
		if (hint.dataset.hint === 'on' && !pointerNear) hint.dataset.hint = 'dim';
	}, HINT_IDLE_MS + (fresh ? delay : 0));
}

function hintOut() {
	const hint = hintEl();
	if (!hint || !hint.dataset.hint) return;
	clearTimeout(hintTimer);
	hint.dataset.hint = 'out';
	hintTimer = window.setTimeout(() => {
		if (hint.dataset.hint === 'out') delete hint.dataset.hint;
	}, EXIT_MS);
}

// The hint lives in the rail above the nav; it brightens while the pointer is over the rail.
function bindHint() {
	const rail = $('.rail');
	if (!rail || rail.dataset.hintBound) return;
	rail.dataset.hintBound = '1';
	rail.addEventListener('pointerenter', (e) => {
		if (e.pointerType === 'touch' || state() !== 'expanded') return;
		pointerNear = true;
		hintOn();
	});
	rail.addEventListener('pointerleave', () => {
		pointerNear = false;
		if (state() === 'expanded') hintOn(); // restart the settle timer
	});
}

function isTyping(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

document.addEventListener('keydown', (e) => {
	if (state() !== 'expanded') return;
	if (hintEl()?.dataset.hint) hintOn();
	if (e.key !== 'Escape' || e.defaultPrevented || e.repeat) return;
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || isTyping(e.target)) return;
	e.preventDefault();
	// The keypress flips the browser into keyboard focus mode, which would draw a focus
	// ring on the last-clicked nav link; drop focus since the panel is closing anyway.
	if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
	const kbd = hintEl()?.querySelector('kbd');
	if (kbd && !reduced()) {
		kbd.animate({ transform: ['scale(1)', 'scale(0.94)', 'scale(1)'] }, { duration: 120, easing: EASE_OUT });
	}
	window.setTimeout(() => navigate('/'), reduced() ? 0 : 100);
});

// ---------- the swap ----------

function swapPanel(next: Document, from: State) {
	const panel = $('[data-panel]');
	const incoming = next.querySelector('[data-panel-content]');
	if (!panel || !incoming) return;

	for (const old of panel.querySelectorAll<HTMLElement>('[data-panel-content]')) {
		unobserve(old);
		old.removeAttribute('data-panel-content');
		old.removeAttribute('data-entering');
		old.setAttribute('data-leaving', '');
		old.setAttribute('aria-hidden', 'true');
		old.inert = true;
		if (old.childElementCount === 0) old.remove();
		else {
			// Remove once the 120ms exit has played (or soon after, regardless).
			const gone = () => old.remove();
			Promise.all(old.getAnimations().map((a) => a.finished)).then(gone, gone);
			setTimeout(gone, EXIT_MS * 4);
		}
	}

	const content = document.adoptNode(incoming) as HTMLElement;
	panel.insertBefore(content, panel.querySelector('[data-panel-edge]'));
	if (content.childElementCount === 0) return;

	const r = reduced();
	if (from === 'idle') {
		// Surface first: content arrives from ~60% of the expansion.
		enter(content, 'stagger', { base: r ? 0 : Math.round(EXPAND_MS * 0.6), dur: 220, stagger: 35 });
	} else {
		// Section swap: after the 120ms exit, a quicker 180ms entrance.
		enter(content, 'stagger', { base: r ? 0 : 100, dur: 180, stagger: 30 });
	}
}

document.addEventListener('astro:before-swap', (event) => {
	const next = event.newDocument;
	// Only shell → shell navigations get the custom swap.
	if (!document.querySelector('[data-shell]') || !next.querySelector('[data-shell]')) return;

	event.swap = () => {
		const from = state();
		swapFunctions.deselectScripts(next);
		const restoreFocus = swapFunctions.saveFocus();
		morph(() => {
			swapFunctions.swapRootAttributes(next);
			swapFunctions.swapHeadElements(next);
		}, from);
		const to = state();
		syncNav(event.to.pathname);
		swapPanel(next, from);

		if (from === 'idle' && to === 'expanded') {
			preview(null);
			hintOn(HINT_DELAY_MS);
		} else if (from === 'expanded' && to === 'idle') {
			hintOut();
			// The headline re-reveals once the panel is ~70% collapsed.
			play(introItems(), { base: reduced() ? 0 : Math.round(COLLAPSE_MS * 0.7), stagger: 40 }, true);
		}
		restoreFocus();
	};
});

// ---------- first load ----------

function boot() {
	const body = document.body;
	if (!body.hasAttribute('data-boot')) return;
	const panel = $('[data-panel]');
	const expanded = state() === 'expanded';
	const r = reduced();

	const rail = [...document.querySelectorAll<HTMLElement>('.rail [data-reveal]')];
	if (expanded) play(rail, { base: 0, stagger: 0 });
	else play(rail, { base: 60, stagger: 40 });

	if (panel) {
		panel.animate(
			r ? { opacity: [0, 1] } : { opacity: [0, 1], transform: ['scale(0.985)', 'scale(1)'] },
			{ duration: 500, easing: EASE_OUT },
		);
		const content = panel.querySelector<HTMLElement>('[data-panel-content]');
		if (content && content.childElementCount > 0) enter(content, 'block', { base: r ? 0 : 150, dur: 220 });
	}
	if (expanded) hintOn(HINT_DELAY_MS);
	body.removeAttribute('data-boot');
}

function init() {
	bindNav();
	bindHint();
	boot();
}

init();
document.addEventListener('astro:page-load', init);

const panel = $('[data-panel]');
if (panel) startFilm(panel);
