// /llms.txt: a plain-markdown summary of the site for LLM crawlers and AI
// search (https://llmstxt.org). Generated at build time from the same data the
// pages use, so new projects and posts show up without editing this file.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { experience, education, skills, RESUME_PDF } from '../data/resume';
import { sortProjectsByDate } from '@/utils';

// Frontmatter dates like 'Dec 12 2025' parse as local midnight, so read them back
// with local getters to print the same calendar day on any machine.
const pad = (n: number) => String(n).padStart(2, '0');
const year = (d: Date) => d.getFullYear();
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export const GET: APIRoute = async ({ site }) => {
	const url = (path: string) => new URL(path, site).href;

	const projects = sortProjectsByDate(await getCollection('project', ({ data }) => !data.draft));
	const posts = (await getCollection('blog', ({ data }) => !data.draft && !data.hide))
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	const lines = [
		'# Yiyuan Li',
		'',
		'> Software engineer in Singapore building AI agent infrastructure: agent tools and the sandboxing around them, evals, and the quality layer under inference routing. Works mostly in Rust, C and TypeScript.',
		'',
		'Yiyuan Li (also "YY", handle "yuann3", site eyuan.me) is a software engineer based in Singapore, currently at Voltade building Volty, a multi-tenant AI agent platform that answers customers for businesses on WhatsApp and email. The work is anchored in the fundamentals of software engineering, and the side projects rebuild the classics from scratch: a SQLite engine, a Redis server, an interpreter, a path tracer, a GPU shader renderer inside Emacs, and an actor-based multi-agent runtime in Rust. Outside code: Emacs, house music and movies.',
		'',
		'## Links',
		'',
		`- [Website](${url('/')})`,
		`- [About](${url('/about')}): short personal intro`,
		`- [Resume](${url('/resume')}): experience, education and skills; [PDF](${url(RESUME_PDF)})`,
		`- [Projects](${url('/projects')})`,
		`- [Writing](${url('/blog')})`,
		'- [GitHub](https://github.com/yuann3)',
		'- [LinkedIn](https://linkedin.com/in/yyuanl)',
		'- [X](https://twitter.com/eyuann3)',
		'- Email: yy@eyuan.me',
		'',
		'## Experience',
		'',
		...experience.map((e) => `- ${e.title} (${e.period}): ${e.description ?? ''}`.trimEnd()),
		'',
		'## Education',
		'',
		...education.map((e) => `- ${e.title} (${e.period})`),
		'',
		'## Skills',
		'',
		skills.join(', '),
		'',
		'## Projects',
		'',
		...projects.map(({ slug, data }) => {
			const stack = data.stack.length ? ` Stack: ${data.stack.join(', ')}.` : '';
			const github = data.github ? ` Source: ${data.github}` : '';
			return `- [${data.title}](${url(`/projects/${slug}`)}) (${year(data.pubDate)}): ${sentence(data.summary ?? data.description)}${stack}${github}`;
		}),
		'',
		'## Writing',
		'',
		...posts.map(({ slug, data }) => `- [${data.title}](${url(`/blog/${slug}`)}) (${day(data.pubDate)}): ${data.description}`),
		'',
		'## Optional',
		'',
		`- [RSS feed](${url('/rss.xml')})`,
		`- [Archive by year](${url('/archive')})`,
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
