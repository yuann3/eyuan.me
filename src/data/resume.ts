// Content of the /resume page. Copy matches the Paper design.

export type ResumeEntry = {
	period: string;
	title: string;
	description?: string;
};

export const RESUME_PDF = "/YiyuanLi_Resume.pdf";

export const about =
	"Software engineer building AI agent systems and the infrastructure under them. I work on Volty at Voltade, a multi-tenant agent platform that answers customers for businesses on WhatsApp and email, and I write agent runtimes in Rust on the side. I usually end up taking a system apart one layer deeper than the job needs.";

export const experience: ResumeEntry[] = [
	{
		period: "Jun 2026 — Present",
		title: "Software Engineer at Voltade Pte. Ltd.",
		description:
			"One of two core engineers on Volty, a multi-tenant AI agent platform. Reworked how agent turns are scheduled across tenants, built the first version of the agent's MCP server access with OAuth, live token streaming and hard abort for agent turns, and tenant-isolated realtime, and wrote most of the operator app.",
	},
	{
		period: "Jan — May 2026",
		title: "Software Engineer – AI at ClassDo Pte. Ltd.",
		description:
			"Designed how agents validate and hand off work in a multi-agent curriculum generator, and built its Hono backend in a Turborepo monorepo with ~800 tests.",
	},
	{
		period: "Jan — Sep 2025",
		title: "Software Engineering Intern at Newcastle Australia IHE Pte. Ltd.",
		description:
			"Built a RAG learning platform for document Q&A with FastAPI, React and Ollama, and a parsing and vector-search pipeline that cut query response time by 40%.",
	},
	{
		period: "Feb — Nov 2024",
		title: "Technical Leader, Data Structures & Algorithms at The University of Newcastle",
		description:
			"Ran algorithm workshops and wrote teaching material on topics like B-tree rebalancing and amortized complexity.",
	},
];

export const education: ResumeEntry[] = [
	{
		period: "2025 — 2026",
		title: "Computer Science at Singapore University of Technology and Design (SUTD), 42 Singapore",
	},
	{
		period: "2024 — 2025",
		title: "Bachelor of Information Technology at The University of Newcastle",
	},
];

export const skills: string[] = [
	"TypeScript",
	"Rust",
	"Python",
	"C",
	"Go",
	"SQL",
	"Agent runtimes",
	"MCP",
	"LLM-as-judge evals",
	"PostgreSQL",
	"pg-boss",
	"Bun",
	"Hono",
	"Tokio",
	"React",
	"AWS",
	"Docker",
	"Playwright",
];
