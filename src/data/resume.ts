// Content of the /resume page. Copy matches the Paper design.

export type ResumeEntry = {
	period: string;
	title: string;
	description?: string;
};

export const RESUME_PDF = "/YiyuanLi_Resume.pdf";

export const about =
	"Software engineer and full-stack engineer with 2+ years of experience, specializing in Rust and C. Passionate about building high-performance systems and exploring the deeper mechanics of software.";

export const experience: ResumeEntry[] = [
	{
		period: "2026 — Current",
		title: "Software Engineer – AI at ClassDo Pte. Ltd.",
		description:
			"Designed and built a multi-agent AI curriculum platform from scratch using a Turborepo monorepo. Owned software architecture decisions and integrated complex frameworks like SkillsFuture into Supabase.",
	},
	{
		period: "2025 — 2025",
		title: "Software Engineering Intern at Newcastle Australia IHE Pte. Ltd.",
		description:
			"Developed a full-stack RAG AI learning platform and implemented a document parsing pipeline that reduced query response time by 40%. Built secure authentication systems and RESTful APIs handling 1,000+ daily requests.",
	},
	{
		period: "2024 — 2024",
		title: "Technical Leader, Data Structures & Algorithms at The University of Newcastle",
		description:
			"Led intensive algorithm workshops and developed custom teaching materials for complex computer science concepts.",
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
	"Rust",
	"C",
	"C++",
	"Python",
	"SQL",
	"TypeScript",
	"Go",
	"React.js",
	"Vue.js",
	"PostgreSQL",
	"Redis",
	"AWS",
	"Docker",
	"Distributed Systems",
	"RAG",
	"Microservices",
	"CI/CD",
];
