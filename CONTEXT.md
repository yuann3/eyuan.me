# eyuan.me

Yiyuan's personal site and blog. It is the Reference site for [yuanme](https://github.com/yuann3/yuanme), the Rust static site generator that will replace Astro here. Engine-level terms (Engine, Site, Author, Source format, Org subset, Collection, Parity exception) are defined in yuanme's `CONTEXT.md`.

## Language

### Content

**Post**:
A blog entry, published at `/blog/<slug>`, written in either Source format.
_Avoid_: article, entry, blog (for a single post)

**Project**:
A portfolio entry, published at `/projects/<slug>`.

### Interface

**Shell**:
The persistent two-column layout every page renders inside: the left rail and the Panel. Navigation swaps the Panel's content and never replaces the Shell.
_Avoid_: layout, frame

**Panel**:
The rounded right-hand region of the Shell that holds page content and is its own scroll container.

**Film**:
The living WebGL gradient drawn behind the Panel, with a static CSS fallback.
_Avoid_: background, shader (the implementation, not the concept)

**Idle / Expanded**:
The two Shell states. Idle is the home page; Expanded is any page belonging to a Section, where the rail collapses and the Panel widens.

**Section**:
One of the top-level areas (`about`, `projects`, `writing`, `resume`) that puts the Shell in the Expanded state.
