// The rest of the pile's code loads once the pile scrolls into view, with
// import() (`photopile-lazy`), which keeps /about/ under its JS Budget.
import type { MountContext } from 'yuanme:mount';

export function mount({ signal }: MountContext) {
	const pile = document.querySelector('[data-panel-content] [data-pile]');
	if (!pile) return;
	const seen = new IntersectionObserver(([entry]) => {
		if (!entry.isIntersecting) return;
		seen.disconnect();
		import('/scripts/photo-pile').then((pile) => pile.boot());
	});
	seen.observe(pile);
	signal.addEventListener('abort', () => seen.disconnect());
}
