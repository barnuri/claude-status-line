#!/usr/bin/env bun
/**
 * Generates an HTML preview page for the claude-status-line.
 * Usage: bun run scripts/preview.ts [--out path/to/out.html]
 * Writes a self-contained HTML file with all demo scenarios.
 */

import { StatusParser } from '../src/statusParser.ts';
import { StatusRenderer } from '../src/statusRenderer.ts';
import * as fs from 'fs';
import * as path from 'path';

const SCENARIOS: Array<{ title: string; input: object; width?: number }> = [
  {
    title: 'Normal — all quotas healthy',
    input: {
      cwd: '/Users/barnu/projects/my-cool-app',
      model: 'claude-sonnet-4-6',
      context_window: { percentage: 28, tokens: 56000, size: 200000 },
      rate_limits: {
        session: { used: 25, limit: 100 },
        week: { used: 15, limit: 100 },
      },
    },
  },
  {
    title: 'Warning — session running low',
    input: {
      cwd: '/Users/barnu/projects/my-cool-app',
      model: 'claude-opus-4-8',
      context_window: { percentage: 65, tokens: 130000, size: 200000 },
      rate_limits: {
        session: { used: 55, limit: 100 },
        week: { used: 30, limit: 100 },
      },
    },
  },
  {
    title: 'Critical — nearly exhausted',
    input: {
      cwd: '/Users/barnu/projects/my-cool-app',
      model: 'claude-haiku-4-5-20251001',
      context_window: { percentage: 91, tokens: 182000, size: 200000 },
      rate_limits: {
        session: { used: 85, limit: 100 },
        week: { used: 75, limit: 100 },
      },
    },
  },
  {
    title: 'Narrow terminal — wraps to next line',
    input: {
      cwd: '/Users/barnu/projects/my-cool-app',
      model: 'claude-sonnet-4-6',
      context_window: { percentage: 42, tokens: 84000, size: 200000 },
      rate_limits: {
        session: { used: 40, limit: 100 },
        week: { used: 20, limit: 100 },
      },
    },
    width: 50,
  },
];

class PreviewGenerator {
  private readonly parser = new StatusParser();
  private readonly renderer = new StatusRenderer();

  generate(): string {
    const scenarios = SCENARIOS.map(s => this.renderScenario(s));
    return this.buildHtml(scenarios);
  }

  private renderScenario(scenario: { title: string; input: object; width?: number }): string {
    const status = this.parser.parse(JSON.stringify(scenario.input));
    const segments = this.parser.buildSegments(status);
    const ansiOutput = this.renderer.render(segments, scenario.width ?? 0);
    const htmlLines = ansiOutput.split('\n').map(line => this.ansiToHtml(line));
    return `
      <div class="scenario">
        <div class="scenario-title">${this.escape(scenario.title)}</div>
        <div class="terminal">
          ${htmlLines.map(l => `<div class="term-line">${l}</div>`).join('\n          ')}
        </div>
      </div>`;
  }

  private ansiToHtml(line: string): string {
    const colorMap: Record<string, string> = {
      '30': 'color:#1a1a1a',
      '31': 'color:#ff5555',
      '32': 'color:#50fa7b',
      '33': 'color:#f1fa8c',
      '34': 'color:#82aaff',
      '35': 'color:#c792ea',
      '36': 'color:#89ddff',
      '37': 'color:#f8f8f2',
      '90': 'color:#6272a4',
      '97': 'color:#ffffff',
      '40': 'background:#1a1a1a',
      '41': 'background:#ff5555',
      '42': 'background:#50fa7b',
      '43': 'background:#f1fa8c',
      '44': 'background:#3d6fd6',
      '45': 'background:#9b59b6',
      '46': 'background:#20b2aa',
      '47': 'background:#f8f8f2',
      '100': 'background:#44475a',
    };

    let html = '';
    let styleStack: string[] = [];
    let openSpan = false;

    const parts = line.split(/\x1b\[([0-9;]*)m/);

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        const text = parts[i] ?? '';
        if (text) {
          if (openSpan) { html += '</span>'; }
          const style = styleStack.join(';');
          if (style) {
            html += `<span style="${style}">`;
            openSpan = true;
          } else {
            openSpan = false;
          }
          html += this.escape(text);
        }
      } else {
        const code = parts[i] ?? '';
        if (code === '0' || code === '') {
          styleStack = [];
        } else if (code === '1') {
          styleStack = styleStack.filter(s => !s.startsWith('font-weight'));
          styleStack.push('font-weight:bold');
        } else {
          const styles = code.split(';')
            .map(c => colorMap[c])
            .filter((s): s is string => Boolean(s));
          for (const s of styles) {
            const prop = s.split(':')[0];
            styleStack = styleStack.filter(existing => !existing.startsWith(prop ?? ''));
            styleStack.push(s);
          }
        }
      }
    }

    if (openSpan) { html += '</span>'; }
    return html || '&nbsp;';
  }

  private buildHtml(scenarios: string[]): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>claude-status-line preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #282a36;
      font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 14px;
      padding: 32px;
      color: #f8f8f2;
    }
    h1 {
      color: #bd93f9;
      font-size: 18px;
      margin-bottom: 28px;
      letter-spacing: 0.5px;
    }
    .scenario {
      margin-bottom: 28px;
    }
    .scenario-title {
      color: #6272a4;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .terminal {
      background: #21222c;
      border-radius: 8px;
      padding: 12px 16px;
      border: 1px solid #44475a;
      display: inline-block;
      min-width: 500px;
    }
    .term-line {
      line-height: 1.8;
      white-space: pre;
    }
  </style>
</head>
<body>
  <h1>claude-status-line</h1>
  ${scenarios.join('\n  ')}
</body>
</html>`;
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

const outArg = process.argv.indexOf('--out');
const outPath = outArg !== -1 ? (process.argv[outArg + 1] ?? 'docs/preview.html') : 'docs/preview.html';

const generator = new PreviewGenerator();
const html = generator.generate();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`Preview written to: ${outPath}`);
