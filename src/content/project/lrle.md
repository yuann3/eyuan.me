---
title: 'LRLE'
description: 'GPU-accelerated 3D terrain visualizer in Rust'
pubDate: 'Dec 22 2025'
platform: All
stack: ["Rust", "WGSL", "wgpu"]
website: https://github.com/yuann3/lrle
github: https://github.com/yuann3/lrle
---

# LRLE

GPU-accelerated 3D terrain visualizer. Loads heightmap data from FDF files and renders them in real-time. WIP but it works.

## Features

- Cross-platform GPU rendering via wgpu
- Interactive orbital camera with mouse and keyboard controls
- Adjustable height scaling for heightmap visualization
- Built-in egui UI panel with stats
- Efficient mesh generation from heightmap grid data

## Usage

```bash
cargo build --release
lrle terrain.fdf
lrle terrain.fdf --height-scale 2.0
```

## Why

Wanted to get my hands dirty with real-time GPU rendering and wgpu. FDF files are a simple heightmap format - perfect for learning 3D visualization without dealing with complex model formats.
