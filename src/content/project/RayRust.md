---
title: 'RayRust'
description: 'just a ray tracer in Rust'
pubDate: 'Jun 30 2024'
heroImage:
    url: 'https://github.com/user-attachments/assets/67c509ac-c1f3-4d3b-9edc-e1b77f277197'
    alt: 'RayRust'
platform: All 
stack: ["rust", "WGSL", "WebGPU"]
website: https://github.com/yuann3/RayRust
github: https://github.com/yuann3/RayRust
---

a ray tracer with both CPU and GPU acceleration capabilities implemented in rust, just a fun project, do it for learning purpose

with

- Path tracing with Monte Carlo sampling
- Materials: Lambertian diffuse, metal, dielectric (glass)
- Camera with depth of field and adjustable field of view
- Cross-platform GPU acceleration using wgpu
- PPM image output format

## Prerequisites

- just your shitty laptop, that have GPU with Vulkan, Metal, or DirectX 12 support (if you dont have then use your poor cpu)

## Building

### CPU-only version

```bash
cargo build --release
```

### With GPU acceleration

```bash
cargo build --release --features gpu
```

## Running

### Basic usage

```bash
cargo run --release
```

### With GPU acceleration

```bash
cargo run --release --features gpu -- --gpu
```

### Saving to a file

```bash
cargo run --release -- -o output.ppm
```

### Using GPU acceleration and saving to a file

```bash
cargo run --release --features gpu -- --gpu -o output.ppm
```

## Command Line Options

- `--gpu` or `-g`: Enable GPU acceleration (requires compilation with `--features gpu`)
- `-o` or `--output` followed by a filename: Save the render to a PPM file

## Performance

ofc GPU-accelerated version can be significantly faster than the CPU version, especially for high sample counts and complex scenes. Performance will vary based on your specific GPU.

## Configuration

You might want to adjust rendering parameters in `main.rs` for faster preview:

```rust
// Camera setup
let mut cam = Camera::new();
cam.aspect_ratio = 16.0 / 9.0;
cam.image_width = 1200;
cam.samples_per_pixel = 500; // Lower this to 100-200 for faster rendering
cam.max_depth = 50;
cam.vfov = 20.0;
cam.lookfrom = Point3::new(13.0, 2.0, 3.0);
cam.lookat = Point3::new(0.0, 0.0, 0.0);
cam.vup = Vec3::new(0.0, 1.0, 0.0);
cam.defocus_angle = 0.6;
cam.focus_dist = 10.0;
cam.use_gpu = use_gpu; // This is set from command-line args
```

## Implementation Details

- CPU rendering is implemented in pure Rust
- GPU rendering is implemented using wgpu for cross-platform compatibility (Metal on macOS, Vulkan on Linux, DirectX 12 on Windows)
- The ray tracing algorithm is implemented as a compute shader in WGSL

