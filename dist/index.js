// @bun
// src/statusParser.ts
import * as path from "path";

class StatusParser {
  parse(raw) {
    if (!raw.trim()) {
      return {};
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  buildSegments(status) {
    const segments = [];
    const folder = this.extractFolder(status);
    if (folder) {
      segments.push({ label: "", value: folder, color: "cyan" });
    }
    const model = this.extractModel(status);
    if (model) {
      segments.push({ label: "", value: model, color: "yellow" });
    }
    const contextPercent = this.extractContextPercent(status);
    if (contextPercent !== null) {
      segments.push({ label: "ctx", value: `${contextPercent}%`, color: "green" });
    }
    const tokenCount = this.extractTokenCount(status);
    if (tokenCount !== null) {
      segments.push({ label: "tokens", value: this.formatTokens(tokenCount), color: "magenta" });
    }
    const rateLimitSegments = this.extractRateLimits(status);
    segments.push(...rateLimitSegments);
    return segments;
  }
  extractFolder(status) {
    const dir = status.cwd ?? status.workspace?.current_dir;
    if (!dir) {
      return null;
    }
    return path.basename(dir);
  }
  extractModel(status) {
    return status.model ?? null;
  }
  extractContextPercent(status) {
    const ctx = status.context_window;
    if (!ctx) {
      return null;
    }
    if (typeof ctx.percentage === "number") {
      return Math.round(ctx.percentage);
    }
    const tokens = ctx.tokens ?? ctx.token_count ?? ctx.input;
    const size = ctx.size;
    if (typeof tokens === "number" && typeof size === "number" && size > 0) {
      return Math.round(tokens / size * 100);
    }
    return null;
  }
  extractTokenCount(status) {
    const ctx = status.context_window;
    if (!ctx) {
      return null;
    }
    return ctx.tokens ?? ctx.token_count ?? ctx.input ?? null;
  }
  extractRateLimits(status) {
    const limits = status.rate_limits;
    if (!limits) {
      return [];
    }
    const knownKeys = ["session", "week", "day"];
    const segments = [];
    for (const key of knownKeys) {
      const limit = limits[key];
      if (!limit) {
        continue;
      }
      const pct = this.calcRemainingPercent(limit);
      if (pct === null) {
        continue;
      }
      const color = pct < 20 ? "red" : pct < 50 ? "yellow" : "blue";
      segments.push({ label: key, value: `${pct}%`, color });
    }
    for (const key of Object.keys(limits)) {
      if (knownKeys.includes(key)) {
        continue;
      }
      const limit = limits[key];
      if (!limit) {
        continue;
      }
      const pct = this.calcRemainingPercent(limit);
      if (pct === null) {
        continue;
      }
      const color = pct < 20 ? "red" : pct < 50 ? "yellow" : "blue";
      segments.push({ label: key, value: `${pct}%`, color });
    }
    return segments;
  }
  calcRemainingPercent(limit) {
    if (typeof limit.percentage === "number") {
      return Math.round(100 - limit.percentage);
    }
    if (typeof limit.remaining === "number" && typeof limit.limit === "number" && limit.limit > 0) {
      return Math.round(limit.remaining / limit.limit * 100);
    }
    if (typeof limit.used === "number" && typeof limit.limit === "number" && limit.limit > 0) {
      return Math.round((limit.limit - limit.used) / limit.limit * 100);
    }
    return null;
  }
  formatTokens(count) {
    if (count >= 1e6) {
      return `${(count / 1e6).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return String(count);
  }
}

// src/types.ts
var ANSI_COLOR = {
  reset: "\x1B[0m",
  cyan: "\x1B[36m",
  yellow: "\x1B[33m",
  green: "\x1B[32m",
  magenta: "\x1B[35m",
  blue: "\x1B[34m",
  red: "\x1B[31m",
  white: "\x1B[37m",
  bold: "\x1B[1m"
};

// src/statusRenderer.ts
var SEPARATOR = " | ";

class StatusRenderer {
  render(segments, terminalWidth) {
    if (segments.length === 0) {
      return "";
    }
    const parts = segments.map((seg) => this.formatSegment(seg));
    const plainParts = segments.map((seg) => this.plainText(seg));
    return this.wrapLines(parts, plainParts, terminalWidth);
  }
  formatSegment(seg) {
    const color = ANSI_COLOR[seg.color];
    const text = seg.label ? `${seg.label}: ${seg.value}` : seg.value;
    return `${color}${text}${ANSI_COLOR.reset}`;
  }
  plainText(seg) {
    return seg.label ? `${seg.label}: ${seg.value}` : seg.value;
  }
  wrapLines(coloredParts, plainParts, terminalWidth) {
    const lines = [];
    let currentLineColored = [];
    let currentLineWidth = 0;
    for (let i = 0;i < coloredParts.length; i++) {
      const colored = coloredParts[i] ?? "";
      const plain = plainParts[i] ?? "";
      const addWidth = currentLineColored.length === 0 ? plain.length : SEPARATOR.length + plain.length;
      const fitsOnLine = terminalWidth <= 0 || currentLineWidth + addWidth <= terminalWidth;
      if (!fitsOnLine && currentLineColored.length > 0) {
        lines.push(currentLineColored.join(SEPARATOR));
        currentLineColored = [colored];
        currentLineWidth = plain.length;
      } else {
        currentLineColored.push(colored);
        currentLineWidth += addWidth;
      }
    }
    if (currentLineColored.length > 0) {
      lines.push(currentLineColored.join(SEPARATOR));
    }
    return lines.join(`
`);
  }
}

// src/setupWizard.ts
import * as fs from "fs";
import * as path2 from "path";
import * as os from "os";
var CLAUDE_SETTINGS_PATHS = [
  path2.join(process.cwd(), ".claude", "settings.json"),
  path2.join(os.homedir(), ".claude", "settings.json")
];

class SetupWizard {
  async run() {
    console.log(`
\uD83D\uDE80 Claude Status Line \u2014 Setup
`);
    const settingsPath = this.resolveSettingsPath();
    const settings = this.loadSettings(settingsPath);
    const command = "bunx barnuri/claude-status-line";
    settings.statusLine = {
      type: "command",
      command,
      refreshInterval: 2000
    };
    this.writeSettings(settingsPath, settings);
    console.log(`\u2705 Status line configured in: ${settingsPath}`);
    console.log(`   Command: ${command}`);
    console.log(`
Restart Claude Code to activate the status line.
`);
    console.log("Status line will show:");
    console.log(`  \uD83D\uDCC1 Current folder | \uD83E\uDD16 Model | \uD83D\uDCCA Context% | \uD83D\uDD22 Tokens | \u23F1 Rate limits%
`);
  }
  resolveSettingsPath() {
    for (const candidate of CLAUDE_SETTINGS_PATHS) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    const globalPath = CLAUDE_SETTINGS_PATHS[1];
    if (!globalPath) {
      throw new Error("Could not determine Claude settings path");
    }
    fs.mkdirSync(path2.dirname(globalPath), { recursive: true });
    return globalPath;
  }
  loadSettings(settingsPath) {
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  writeSettings(settingsPath, settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + `
`, "utf-8");
  }
}

// src/index.ts
async function main() {
  const args = process.argv.slice(2);
  const isSetup = args.includes("--setup");
  if (isSetup) {
    const wizard = new SetupWizard;
    await wizard.run();
    return;
  }
  const isTTY = process.stdin.isTTY;
  if (isTTY) {
    const wizard = new SetupWizard;
    await wizard.run();
    return;
  }
  const raw = await readStdin();
  const parser = new StatusParser;
  const status = parser.parse(raw);
  const segments = parser.buildSegments(status);
  const terminalWidth = process.stdout.columns ?? (process.env["COLUMNS"] ? parseInt(process.env["COLUMNS"], 10) : 0) ?? 0;
  const renderer = new StatusRenderer;
  const output = renderer.render(segments, terminalWidth);
  if (output) {
    process.stdout.write(output + `
`);
  }
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
main().catch((err) => {
  if (err instanceof Error) {
    process.stderr.write(`claude-status-line error: ${err.message}
`);
  }
  process.exit(1);
});
