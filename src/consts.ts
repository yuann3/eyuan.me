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

type SocialLink = {
  icon: string;
  friendlyName: string; // for accessibility
  link: string;
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

/** 
  These are you social media links. 
  It uses https://github.com/natemoo-re/astro-icon#readme
  You can find icons @ https://icones.js.org/
*/
export const socialLinks: Array<SocialLink> = [
  {
    icon: "mdi:github",
    friendlyName: "Github",
    link: "https://github.com/Yuann3",
  },
  {
    icon: "mdi:instagram",
    friendlyName: "Instagram",
    link: "https://www.instagram.com/eyuan3/",
  },
  {
    icon: "mdi:twitter",
    friendlyName: "Twitter",
    link: "https://twitter.com/eeuan3",
  },
  {
    icon: "mdi:email",
    friendlyName: "email",
    link: "mailto:yy@eyuan.me",
  },
  {
    icon: "mdi:rss",
    friendlyName: "rss",
    link: "/rss.xml"
  }
];

export const NAV_LINKS: Array<{ title: string, path: string }> = [
  {
    title: "Cave",
    path: "/",
  },
  {
    title: "About",
    path: "/about",
  },
  {
    title: "Blog",
    path: "/blog",
  },
  {
    title: "Projects",
    path: '/projects'
  },
  {
    title: "TimeMachine",
    path: '/archive'
  }
];
