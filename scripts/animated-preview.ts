#!/usr/bin/env bun
/**
 * Generates an animated HTML preview (CSS keyframe animation cycling through scenarios).
 * Usage: bun run scripts/animated-preview.ts [--out path/to/out.html]
 */

import { StatusParser } from '../src/statusParser.ts';
import { StatusRenderer } from '../src/statusRenderer.ts';
import * as fs from 'fs';
import * as path from 'path';

const FRAMES: Array<{ label: string; input: object }> = [
  {
    label: 'Healthy session',
    input: {
      cwd: '/projects/my-app',
      model: 'claude-sonnet-4-6',
      context_window: { percentage: 22, tokens: 44000, size: 200000 },
      rate_limits: { session: { used: 20, limit: 100 }, week: { used: 12, limit: 100 } },
    },
  },
  {
    label: 'Context growing',
    input: {
      cwd: '/projects/my-app',
      model: 'claude-sonnet-4-6',
      context_window: { percentage: 55, tokens: 110000, size: 200000 },
      rate_limits: { session: { used: 42, limit: 100 }, week: { used: 28, limit: 100 } },
    },
  },
  {
    label: 'Session warning',
    input: {
      cwd: '/projects/my-app',
      model: 'claude-opus-4-8',
      context_window: { percentage: 71, tokens: 142000, size: 200000 },
      rate_limits: { session: { used: 58, limit: 100 }, week: { used: 35, limit: 100 } },
    },
  },
  {
    label: 'Critical — act now',
    input: {
      cwd: '/projects/my-app',
      model: 'claude-haiku-4-5-20251001',
      context_window: { percentage: 94, tokens: 188000, size: 200000 },
      rate_limits: { session: { used: 88, limit: 100 }, week: { used: 70, limit: 100 } },
    },
  },
];

const FRAME_DURATION_S = 2.5;

class AnimatedPreviewGenerator {
  private readonly parser = new StatusParser();
  private readonly renderer = new StatusRenderer();

  generate(): string {
    const renderedFrames = FRAMES.map(f => ({
      label: f.label,
      html: this.renderFrame(f.input),
    }));

    const total = renderedFrames.length;
    const totalDuration = total * FRAME_DURATION_S;
    const pct = (i: number) => ((i / total) * 100).toFixed(2);

    const keyframes = renderedFrames.map((_, i) => {
      const s = parseFloat(pct(i));
      const fi = s + (100 / total) * 0.1;
      const fo = parseFloat(pct(i + 1)) - (100 / total) * 0.1;
      const e = parseFloat(pct(i + 1));
      return `  @keyframes f${i} {
    0%      { opacity:0 }
    ${s.toFixed(2)}%  { opacity:0 }
    ${fi.toFixed(2)}% { opacity:1 }
    ${fo.toFixed(2)}% { opacity:1 }
    ${e.toFixed(2)}%  { opacity:0 }
    100%    { opacity:0 }
  }`;
    }).join('\n');

    const frameDivs = renderedFrames.map((f, i) => {
      const lines = f.html.split('\n').map(l => `        <div class="term-line">${l}</div>`).join('\n');
      return `    <div class="frame" style="animation:f${i} ${totalDuration}s linear infinite">
      <div class="label">${this.escape(f.label)}</div>
      <div class="terminal">
${lines}
      </div>
    </div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>claude-status-line</title>
<style>
* { box-sizing:border-box; margin:0; padding:0 }
body {
  background:#282a36;
  font-family:'JetBrains Mono','Cascadia Code','Fira Code',monospace;
  font-size:14px;
  padding:36px 40px;
  color:#f8f8f2;
  width:680px;
}
h1 { color:#bd93f9; font-size:16px; margin-bottom:24px; letter-spacing:.5px }
.stage { position:relative; height:100px }
.frame { position:absolute; top:0; left:0; width:100%; opacity:0 }
.label { color:#6272a4; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px }
.terminal {
  background:#21222c;
  border-radius:8px;
  padding:10px 16px;
  border:1px solid #44475a;
  display:inline-block;
  min-width:560px;
}
.term-line { line-height:1.9; white-space:pre }
${keyframes}
</style>
</head>
<body>
<h1>claude-status-line</h1>
<div class="stage">
${frameDivs}
</div>
</body>
</html>`;
  }

  private renderFrame(input: object): string {
    const status = this.parser.parse(JSON.stringify(input));
    const segments = this.parser.buildSegments(status);
    const ansiOutput = this.renderer.render(segments, 0);
    return ansiOutput.split('\n').map(line => this.ansiToHtml(line)).join('\n');
  }

  private ansiToHtml(line: string): string {
    const colorMap: Record<string, string> = {
      '30': 'color:#1a1a1a', '31': 'color:#ff5555', '32': 'color:#50fa7b',
      '33': 'color:#f1fa8c', '34': 'color:#3d6fd6', '35': 'color:#9b59b6',
      '36': 'color:#20b2aa', '37': 'color:#f8f8f2', '90': 'color:#6272a4', '97': 'color:#ffffff',
      '40': 'background:#1a1a1a', '41': 'background:#ff5555', '42': 'background:#50fa7b',
      '43': 'background:#f1fa8c', '44': 'background:#3d6fd6', '45': 'background:#9b59b6',
      '46': 'background:#20b2aa', '47': 'background:#f8f8f2', '100': 'background:#44475a',
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
          for (const c of code.split(';')) {
            const s = colorMap[c];
            if (!s) { continue; }
            const prop = s.split(':')[0] ?? '';
            styleStack = styleStack.filter(e => !e.startsWith(prop));
            styleStack.push(s);
          }
        }
      }
    }

    if (openSpan) { html += '</span>'; }
    return html || '&nbsp;';
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

const outArg = process.argv.indexOf('--out');
const outPath = outArg !== -1 ? (process.argv[outArg + 1] ?? 'docs/animated.html') : 'docs/animated.html';

const generator = new AnimatedPreviewGenerator();
const html = generator.generate();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`Animated preview written to: ${outPath}`);
