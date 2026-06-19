# claude-status-line

A Claude Code status line built with Bun/TypeScript. Shows real-time session info directly in your terminal status area.

```
claude-status-line | claude-sonnet-4-6 | ctx: 42% | tokens: 85.0k | session: 50% | week: 80%
```

If the content doesn't fit the terminal width it wraps to additional lines — no info is ever truncated.

## What it shows

| Segment | Description |
|---|---|
| **folder** | Current working directory basename |
| **model** | Claude model name (e.g. `claude-sonnet-4-6`) |
| **ctx: N%** | Context window usage percentage |
| **tokens: N** | Total input token count |
| **session: N%** | Remaining session quota % |
| **week: N%** | Remaining weekly quota % |

Rate limit segments turn yellow below 50% remaining and red below 20%.

## Setup (one command)

```bash
bunx barnuri/claude-status-line --setup
```

This writes the `statusLine` configuration into your `~/.claude/settings.json` (or `.claude/settings.json` in the current project). Restart Claude Code to activate.

If you run `bunx barnuri/claude-status-line` interactively (without piped stdin) it automatically launches the setup wizard.

## Manual configuration

Add this to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx barnuri/claude-status-line",
    "refreshInterval": 2000
  }
}
```

## How it works

Claude Code pipes a `StatusJSON` blob to the command's stdin on every refresh. The tool parses it, extracts the relevant fields, and writes a colored status line to stdout.

```
Claude Code runtime
    ↓  StatusJSON (stdin)
claude-status-line
    ↓  parse + extract metrics
    ↓  render ANSI-colored segments
    ↓  wrap to terminal width
stdout → Claude Code status bar
```

## Development

```bash
# Run directly with Bun
bun run src/index.ts --setup        # run setup wizard
echo '{"model":"claude-sonnet-4-6","cwd":"/tmp"}' | bun run src/index.ts  # test render

# Simulate narrow terminal
echo '{"model":"claude-sonnet-4-6","cwd":"/tmp","context_window":{"percentage":42,"tokens":85000}}' \
  | COLUMNS=40 bun run src/index.ts
```

## Requirements

- [Bun](https://bun.sh) ≥ 1.0
- Claude Code CLI

## License

MIT
