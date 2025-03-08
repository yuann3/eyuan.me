---
title: 'Ruskey'
description: 'A rust interpreter implementation of custom language Monkey'
pubDate: 'Mar 06 2025'
heroImage:
    url: 'https://github.com/user-attachments/assets/92e15a16-dcc9-45b3-9c5a-93fc98e06b58'
    alt: 'Ruskey'
platform: All 
stack: ["Rust"]
website: https://github.com/yuann3/Ruskey
github: https://github.com/yuann3/Ruskey
---

# Ruskey 🦀

An implementation of the Monkey programming language interpreter in Rust, based on the book "Writing An Interpreter In Go" by Thorsten Ball.

## About

**🚧 Work In Progress 🚧**

This project is currently under active development. It's a Rust implementation of the Monkey programming language introduced in the book "Writing An Interpreter In Go". It serves as both a learning exercise for Rust and interpreter design.

The Monkey language features:
- C-like syntax
- Variable bindings
- Integer and boolean data types
- Functions as first-class citizens
- Closures
- A simple object system

## Project Structure

```
ruskey/
├── src/           # Source code
│   ├── token.rs   # Token definitions
│   ├── lexer.rs   # Lexical analyzer
│   ├── ast.rs     # Abstract Syntax Tree
│   ├── parser.rs  # Parser
│   └── ...
├── tests/         # Test suite
└── ...
```

## Progress

- [x] Lexer implementation
- [x] Parser implementation
- [ ] AST evaluator
- [ ] Object system
- [ ] Environment
- [ ] Function evaluation

## Building and Running

```bash
# Build the project
cargo build

# Run tests
cargo test

# Run the REPL
cargo run
```

## Learning Resources

If you're interested in learning more about interpreters or following along with this project:

1. ["Writing An Interpreter In Go"](https://interpreterbook.com/) by Thorsten Ball
