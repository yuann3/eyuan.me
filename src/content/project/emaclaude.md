---
title: 'emaclaude'
description: 'Agentic coding system with three Claude agents orchestrated in Emacs'
pubDate: 'Mar 15 2026'
platform: All
stack: ["Rust", "Elisp"]
website: https://github.com/yuann3/emaclaude
github: https://github.com/yuann3/emaclaude
---

An agentic coding system that runs directly within Emacs. Three Claude code sessions coordinate across split buffers — one plans, one codes, one reviews — connected through a lightweight Rust CLI and an Elisp orchestrator.

The review agent scrutinizes the implementation and feeds corrections back to the coder. The loop continues until the reviewer approves twice consecutively — a safeguard against hallucinated approvals. Once cleared, a Magit diff view appears for annotation, and you can submit feedback directly to the coding agent for refinement before creating a PR from within Emacs.

No Electron app needed.
