---
title: 'shaderview'
description: 'Real-time GLSL shader preview inside Emacs buffers'
summary: 'live glsl shader preview inside emacs'
summary_short: 'live glsl preview inside emacs'
date: 2026-03-01
stack: ["Rust", "wgpu", "GLSL"]
website: https://github.com/yuann3/shaderview
github: https://github.com/yuann3/shaderview
order: 3
---

An Emacs package for real-time GLSL shader preview directly in the editor. Live preview at whatever fps you want, hot reload on save, ShaderToy-compatible shaders, mouse interaction, and PNG export.

Three-layer architecture: shaderview.el (Elisp UI), shaderview-module (Rust FFI layer), and eg-core (pure Rust GPU library), with wgpu handling Metal/Vulkan. Supports standard uniforms including iResolution, iTime, iTimeDelta, iFrame, and iMouse. No window switching needed.
