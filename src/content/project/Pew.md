---
title: 'Pew'
description: 'A lightweight CLI tool for dumping your codebase into a single file, perfect to work with LLMs'
pubDate: 'April 4 2025'
heroImage:
    url: 'https://github.com/user-attachments/assets/da8e796f-6fab-4e47-8f02-11764d9117a1'
    alt: 'Pew'
platform: All 
stack: ["GO"]
website: https://github.com/yuann3/Pew
github: https://github.com/yuann3/Pew
---

# Pew

Pew is a simple, lightweight CLI for dumping source code or directories into a single file, makes it easier to work with LLMs.

Claude Code and Sonnet 3.7 its amazing at coding, but it lacks intelligence. So the best workflow is dump your code to Grok, asking grok to prompt claude first, create a `PLAN.md`, and let your fellow claude to follow it

**WHAT THIS CLI CAN DO**

- Convert source code files to well-formatted Markdown
- Automatically detect and skip binary files
- Tree-style directory structure visualization
- GitIgnore-style pattern matching via `.pewc` configuration file
- Auto ignore the binary files
- Smart file extension detection for proper syntax highlighting


## Installation

**Using Homebrew**

```bash
brew tap yuann3/pew
brew install pew
```

**Linux**

```bash
# Download and install in one command
curl -L https://raw.githubusercontent.com/yuann3/pew/main/install.sh | bash
```

## Usage

```
pew [flags] [files...]

Flags:
-d <directory>       Directory to dump (mutually exclusive with specifying files)
-o <filename>        Output Markdown file (default: "source.md")
-h                   Show this help message
--no-default-ignores Disable default ignore patterns for directories
```

## Examples

Dump specific files:

```bash
pew file1.go file2.go -o output.md
```

Dump a directory with default ignores:

```bash
pew -d /path/to/project -o project.md
```

Dump a directory without default ignores:

```bash
pew -d /path/to/project --no-default-ignores -o project.md
```

## Configuration with .pewc file

Create a `.pewc` file in your project directory to specify ignore patterns. The `.pewc` file works exactly like `.gitignore`:

```
# Lines starting with # are comments

# Ignore specific files
bla.md
README.md
*.log
*.tmp

# Ignore directories (patterns ending with /)
node_modules/
dist/
build/

# Wildcards work just like in gitignore
doc/*.txt      # Ignore all .txt files in doc/ directory
test/*/data    # Ignore data in subdirectories of test/
```

### Pattern Format

- Blank lines are ignored
- Lines starting with `#` are comments
- Patterns ending with `/` match directories only
- `*` matches any sequence of characters except `/`
- `?` matches any single character except `/`
- You can specify exact filenames like `bla.md` to ignore them

### Default Ignore Patterns

By default, pew ignores these patterns:
- `.*` (hidden files/directories)
- `node_modules/`
- `target/`
- `dist/`
- `build/`
- `bin/`
- `pkg/`
- `.pewc` (the configuration file itself)

Use `--no-default-ignores` to override this behavior.

## Output

The output Markdown file contains:
1. A directory structure tree (if dumping a directory)
2. Code sections with proper syntax highlighting
3. All text files found in the specified location(s), excluding any files that match patterns in your `.pewc` file
