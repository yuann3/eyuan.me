
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		fontFamily: {
			'sans': ['Geist', 'system-ui', 'sans-serif'],
			'mono': ['Geist Mono', 'ui-monospace', 'monospace'],
			'serif': ['Instrument Serif', 'Georgia', 'serif'],
		},
		extend: {
			colors: {
				paper: "var(--paper)",
				ink: "var(--ink)",
				"ink-2": "var(--ink-2)",
				muted: "var(--muted)",
				faint: "var(--faint)",
				hairline: "var(--hairline)",
				// Legacy names, still used by pages that are not migrated yet.
				bgColor: "var(--paper)",
				textColor: "var(--ink)",
				surface: "var(--paper)",
				border: "var(--hairline)",
			},
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}
