---
title: 'mra'
description: 'Multi-agent runtime for Rust — Erlang/OTP-style actors for LLM pipelines'
summary: 'multi-agent runtime for rust, erlang/otp style'
summary_short: 'multi-agent runtime for rust'
date: 2026-02-20
stack: ["Rust", "Tokio"]
website: https://github.com/yuann3/mra
github: https://github.com/yuann3/mra
order: 2
---

A lightweight multi-agent runtime for Rust. Spawn AI agents as Tokio actors, wire them together, let them talk to LLMs. Erlang/OTP ideas applied to LLM pipelines.

Each agent runs as an async task with a bounded message queue and no shared mutable state. A supervision system manages agent lifecycle with restart strategies (OneForOne, OneForAll) and policies (Permanent, Transient, Temporary). Agents can call language models, execute shell commands, read files, and communicate with siblings through context handles. ArcSwap-based mailboxes ensure existing handles continue working after agent restarts.
