---
title: 'Rego'
description: 'A lightweight Redis server implementation written in Go'
pubDate: 'May 7 2025'
platform: All 
stack: ["GO"]
website: https://github.com/yuann3/rego
github: https://github.com/yuann3/rego
---

# Rego

a lightweight Redis server implementation written in Go, designed to be compatible with standard Redis clients while providing core Redis functionality.

## Features

- Standard Redis protocol (RESP) support
- Key-value operations (GET, SET with expiry options)
- Transaction support (MULTI, EXEC, DISCARD)
- Replication (master-slave architecture)
- RDB file parsing and persistence
- Redis Streams support (XADD, XRANGE, XREAD)
- Incremental operations (INCR)

## Getting Started

### Prerequisites

- Go 1.18 or higher

### Running the Server

```bash
# Run the server with default settings
./run.sh

# Run the server with custom settings
./run.sh --port 6380 --dir /path/to/data --dbfilename custom.rdb
```

### Setting up Replication

To create a replica instance:

```bash
# Start the master on default port (6379)
./run.sh

# Start a replica on port 6380
./run.sh --port 6380 --replicaof "localhost 6379"
```

## Project Structure

- `app/` - Source code directory
  - `main.go` - Server initialization and client handling
  - `handler.go` - Command implementations
  - `resp.go` - RESP protocol implementation
  - `key-value-store.go` - In-memory data store
  - `replica.go` - Replication logic
  - `rdb_parser.go` - RDB file format parser
  - `stream.go` & `stream_manager.go` - Redis Streams implementation

## Supported Commands

- Basic: PING, ECHO
- Key-Value: GET, SET (with PX, EX, NX, XX options)
- Keys: KEYS, TYPE
- Configuration: CONFIG GET
- Replication: REPLCONF, PSYNC, WAIT, INFO REPLICATION
- Streams: XADD, XRANGE, XREAD
- Transactions: MULTI, EXEC, DISCARD
- Incremental: INCR
