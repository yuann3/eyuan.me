// Client side of Shell.astro.
//
// Navigation between shell pages uses Astro's <ClientRouter /> with a custom
// swap: the shell (left column, panel, film canvas) is never replaced. We copy
// the new <html> attributes (data-state / data-section drive every CSS
// transition), swap <head>, update the nav, and replace only the panel
// content. Old content fades out, new content rises in (see global.css).

import { swapFunctions } from 'astro:transitions/client';
import { startFilm } from './film';

const LEAVE_MS = 150;

function syncNav(path: string) {
	for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')) {
		const active = link.dataset.section === document.documentElement.dataset.section;
		if (active) link.setAttribute('aria-current', link.pathname === path ? 'page' : 'true');
		else link.removeAttribute('aria-current');
	}
}

function swapPanel(next: Document) {
	const panel = document.querySelector('[data-panel]');
	const incoming = next.querySelector('[data-panel-content]');
	if (!panel || !incoming) return;

	let leaving = false;
	for (const old of panel.querySelectorAll<HTMLElement>('[data-panel-content]')) {
		old.removeAttribute('data-panel-content');
		old.removeAttribute('data-entering');
		old.setAttribute('data-leaving', '');
		old.setAttribute('aria-hidden', 'true');
		old.inert = true;
		if (old.childElementCount === 0) old.remove();
		else {
			leaving = true;
			setTimeout(() => old.remove(), LEAVE_MS);
		}
	}

	const content = document.adoptNode(incoming) as HTMLElement;
	if (content.childElementCount > 0) {
		content.setAttribute('data-entering', leaving ? '' : 'now');
		content.addEventListener('animationend', () => content.removeAttribute('data-entering'), { once: true });
	}
	panel.append(content);
}

document.addEventListener('astro:before-swap', (event) => {
	const next = event.newDocument;
	// Only shell → shell navigations get the custom swap.
	if (!document.querySelector('[data-shell]') || !next.querySelector('[data-shell]')) return;

	event.swap = () => {
		swapFunctions.deselectScripts(next);
		swapFunctions.swapRootAttributes(next);
		swapFunctions.swapHeadElements(next);
		const restoreFocus = swapFunctions.saveFocus();
		syncNav(event.to.pathname);
		swapPanel(next);
		restoreFocus();
	};
});

const panel = document.querySelector<HTMLElement>('[data-panel]');
if (panel) startFilm(panel);
