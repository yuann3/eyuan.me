---
title: 'shell'
description: 'shell - single binary shell'
pubDate: 'Jul 02 2025'
platform: All 
stack: ["Rust"]
website: https://github.com/yuann3/shell
github: https://github.com/yuann3/shell
---

# shell

single-binary shell written in Rust. If you want a fancy terminal emulator or
500 features you’re in the wrong place this just works

- Built-ins: `exit`, `echo`, `pwd`, `cd`, `type`, `history`
- **Pipelines** with `|`
- **Redirection**: `>`, `>>`, `2>`, `2>>`
- **Tab-completion** on commands (including `$PATH` lookups)
- **Persistent history** (reads and appends to `$HISTFILE`)
- Bell on first TAB, list on second

## Requirements

- Rust ≥ 1.80
- Unix-like environment (for exec permissions)

## Getting started

```sh
just cargo run this shit dude
```

