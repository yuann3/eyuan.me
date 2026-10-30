// Reveals: the beUI recipe (opacity, 8px rise, 4px blur; 220ms ease-out)
// applied to reveal items, staggered 35ms in DOM order and capped at the
// 8th item. See motion-api.md for the page-facing contract.
//
// State lives in `data-rv` on each item (wait | in), set only from here;
// the CSS in global.css does the animating. Without JS nothing is hidden.

const CAP = 8;
const THRESHOLD = 0.15;

export type RevealTiming = {
	base?: number; // ms before the first item starts
	dur?: number; // ms per item
	stagger?: number; // ms between items
};

const observers = new WeakMap<HTMLElement, IntersectionObserver>();

function inside(el: HTMLElement, set: Set<HTMLElement>, root: HTMLElement) {
	for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
		if (set.has(p)) return true;
	}
	return false;
}

const REVEAL_ANIMS = new Set(['rv-in', 'rv-fade']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META']);

// Reveal items under `root`, in DOM order:
// - every [data-reveal];
// - direct children of a [data-reveal-group] (a child that is itself a group
//   contributes its own children instead);
// - top-level children of `root` with no reveal markup at all.
// Items nested inside other items are dropped (no compounding fades).
export function revealItems(root: HTMLElement): HTMLElement[] {
	const set = new Set<HTMLElement>();
	for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) set.add(el);
	for (const group of root.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
		for (const child of group.children) {
			if (child instanceof HTMLElement && !child.hasAttribute('data-reveal-group') && !SKIP.has(child.tagName)) set.add(child);
		}
	}
	for (const child of root.children) {
		if (!(child instanceof HTMLElement) || SKIP.has(child.tagName) || set.has(child)) continue;
		if (child.hasAttribute('data-reveal-group') || child.querySelector('[data-reveal], [data-reveal-group]')) continue;
		set.add(child);
	}
	return [...set]
		.filter((el) => !inside(el, set, root))
		.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

function setVar(el: HTMLElement, name: string, value: number | undefined) {
	if (value === undefined) el.style.removeProperty(name);
	else el.style.setProperty(name, `${value}ms`);
}

function cleanup(el: HTMLElement) {
	const done = (e: AnimationEvent) => {
		if (e.target !== el || !REVEAL_ANIMS.has(e.animationName)) return;
		el.removeEventListener('animationend', done);
		el.removeEventListener('animationcancel', done);
		if (el.dataset.rv === 'in') delete el.dataset.rv;
		el.style.removeProperty('--i');
		el.style.removeProperty('--rv-base');
		el.style.removeProperty('--rv-dur');
		el.style.removeProperty('--rv-stagger');
	};
	el.addEventListener('animationend', done);
	el.addEventListener('animationcancel', done);
}

// Play the reveal on `items` together: stagger in the given order.
export function play(items: HTMLElement[], t: RevealTiming = {}, restart = false) {
	if (restart) {
		for (const el of items) el.dataset.rv = 'wait';
		void document.body.offsetWidth; // let the animation start fresh
	}
	items.forEach((el, n) => {
		el.style.setProperty('--i', String(Math.min(n, CAP)));
		setVar(el, '--rv-base', t.base);
		setVar(el, '--rv-dur', t.dur);
		setVar(el, '--rv-stagger', t.stagger);
		el.dataset.rv = 'in';
		cleanup(el);
	});
}

// Hide items (until they are revealed by play()).
export function hide(items: HTMLElement[]) {
	for (const el of items) el.dataset.rv = 'wait';
}

function visibleEnough(e: IntersectionObserverEntry) {
	if (!e.isIntersecting) return false;
	const h = e.boundingClientRect.height;
	const rootH = e.rootBounds?.height ?? window.innerHeight;
	return e.intersectionRect.height >= Math.min(THRESHOLD * h, THRESHOLD * rootH) - 0.5;
}

// Reveal `items` once each as they scroll into view inside `scroller`.
export function observe(scroller: HTMLElement, items: HTMLElement[]) {
	if (!items.length) return;
	const io = new IntersectionObserver((entries) => {
		const batch = entries.filter(visibleEnough).map((e) => e.target as HTMLElement);
		if (!batch.length) return;
		batch.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
		for (const el of batch) io.unobserve(el);
		play(batch);
	}, { root: scroller, threshold: [0, 0.05, 0.1, THRESHOLD] });
	for (const el of items) io.observe(el);
	observers.get(scroller)?.disconnect();
	observers.set(scroller, io);
}

export function unobserve(scroller: HTMLElement) {
	observers.get(scroller)?.disconnect();
	observers.delete(scroller);
}

export type EnterMode = 'block' | 'stagger';

// Bring a panel content layer in. Items in view reveal now (staggered, or
// as one block with the layer); items below the fold wait for the observer.
export function enter(layer: HTMLElement, mode: EnterMode, t: RevealTiming) {
	const items = revealItems(layer);
	const view = layer.getBoundingClientRect();
	const now: HTMLElement[] = [];
	const later: HTMLElement[] = [];
	for (const el of items) {
		const r = el.getBoundingClientRect();
		if (r.width === 0 && r.height === 0) continue; // display:none variant
		(r.top < view.bottom && r.bottom > view.top ? now : later).push(el);
	}

	if (mode === 'block' || !now.length) {
		setVar(layer, '--rv-base', t.base);
		setVar(layer, '--rv-dur', t.dur);
		layer.setAttribute('data-entering', '');
		const done = (e: AnimationEvent) => {
			if (e.target !== layer || !REVEAL_ANIMS.has(e.animationName)) return;
			layer.removeEventListener('animationend', done);
			layer.removeAttribute('data-entering');
		};
		layer.addEventListener('animationend', done);
	} else {
		play(now, t);
	}
	hide(later);
	observe(layer, later);
}
