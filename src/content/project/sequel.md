---
title: 'sequel'
description: 'A rust interpreter implementation of custom language Monkey'
pubDate: 'May 23 2025'
heroImage:
    url: 'https://github.com/user-attachments/assets/92e15a16-dcc9-45b3-9c5a-93fc98e06b58'
    alt: 'sequel'
platform: All 
stack: ["Rust"]
website: https://github.com/yuann3/sequel
github: https://github.com/yuann3/sequel
---

# sequel

A no-bullshit, from-scratch SQLite parser and query engine clone written in Rust. We read raw `.db` files byte-by-byte, manually parse B-trees, and extract rows like it’s the Stone Age. It's part of the Codecrafters SQLite challenge, but with extra muscle and fewer excuses.

## Features

* Parses SQLite DB files directly, no external libraries or bindings
* Supports:

  * `.tables`, `.dbinfo`
  * `SELECT ... FROM ...`
  * `SELECT COUNT(*) FROM ...`
  * `WHERE country = '...’` (only basic equality for now, cuz no point doing it)
* Index optimization with B-tree traversal (yes, it’s fast af)

## Usage

```sh
./run.sh path/to/db "SELECT name, country FROM companies WHERE country = 'Japan'"
```

or

```sh
./run.sh path/to/db ".tables"
```

## Why

Part of "Rewrite everything in Rust" Movement. and real devs read hex dumps and parse varints manually, and I want to get my hands dirty with raw file I/O and binary parsing

## File Structure

Check `src/` — it's clean, modular, and doesn’t hide logic under 10 layers of traits and async shit.

