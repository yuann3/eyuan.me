// This is your config file, place any global data here.
// You can import this data from anywhere in your site by using the `import` keyword.

type Config = {
  title: string;
  description: string;
  lang: string;
  profile: {
    author: string;
    description?: string;
  }
}

export const siteConfig: Config = {
  title: "Eyuan",
  description: "YY's Cave",
  lang: "en-US",
  profile: {
    author: "Yiyuan Li",
    description: "sooooo yupp, just do things"
  }
}

export type Section = 'about' | 'projects' | 'writing' | 'resume';

// Left-column nav of the shell. Order matches the design.
export const SECTIONS: Array<{ id: Section, title: string, path: string }> = [
  { id: "about", title: "About", path: "/about" },
  { id: "projects", title: "Projects", path: "/projects" },
  { id: "writing", title: "Writing", path: "/blog" },
  { id: "resume", title: "Resume", path: "/resume" },
];

// Footer links under the nav.
export const FOOTER_LINKS: Array<{ title: string, link: string }> = [
  { title: "EMAIL", link: "mailto:yy@eyuan.me" },
  { title: "GITHUB", link: "https://github.com/yuann3" },
  { title: "X", link: "https://twitter.com/eyuann3" },
  { title: "RSS", link: "/rss.xml" },
];
