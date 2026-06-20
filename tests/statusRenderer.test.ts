import { describe, it, expect } from 'bun:test';
import { StatusRenderer } from '../src/statusRenderer.ts';
import { ConfigManager } from '../src/configManager.ts';
import type { Segment, Config } from '../src/types.ts';

const renderer = new StatusRenderer();
const cfg = ConfigManager.DEFAULT_CONFIG;

const powerlineCfg: Config = { ...cfg, separatorStyle: 'powerline' };
const spacesCfg: Config = { ...cfg, separatorStyle: 'spaces' };

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const POWERLINE_ARROW = '❯';

function makeSeg(value: string, bg: [number, number, number] = [30, 41, 59], fg: [number, number, number] = [248, 250, 252]): Segment {
  return { icon: '', label: '', value, fg, bg };
}

function ansi48(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

function ansi38(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

// ────────────────────────────────────────────────────────
// Common: empty segments
// ────────────────────────────────────────────────────────

describe('StatusRenderer — empty segments', () => {
  it('returns empty string for spaces mode', () => {
    expect(renderer.render([], 200, spacesCfg)).toBe('');
  });

  it('returns empty string for powerline mode', () => {
    expect(renderer.render([], 200, powerlineCfg)).toBe('');
  });
});

// ────────────────────────────────────────────────────────
// Spaces mode
// ────────────────────────────────────────────────────────

describe('StatusRenderer — spaces mode', () => {
  it('single segment contains 24-bit bg ANSI code', () => {
    const seg = makeSeg('hello', [30, 41, 59]);
    const out = renderer.render([seg], 200, spacesCfg);
    expect(out).toContain(ansi48(30, 41, 59));
  });

  it('single segment contains 24-bit fg ANSI code', () => {
    const seg = makeSeg('hello', [30, 41, 59], [248, 250, 252]);
    const out = renderer.render([seg], 200, spacesCfg);
    expect(out).toContain(ansi38(248, 250, 252));
  });

  it('single segment contains bold and reset', () => {
    const seg = makeSeg('hello');
    const out = renderer.render([seg], 200, spacesCfg);
    expect(out).toContain(BOLD);
    expect(out).toContain(RESET);
  });

  it('includes segment value in output', () => {
    const seg = makeSeg('my-project');
    const out = renderer.render([seg], 200, spacesCfg);
    expect(out).toContain('my-project');
  });

  it('formats label: value when label is non-empty', () => {
    const seg: Segment = { icon: '!', label: 'ctx', value: '45%', fg: [248, 250, 252], bg: [21, 128, 61] };
    const out = renderer.render([seg], 200, spacesCfg);
    expect(out).toContain('ctx: 45%');
  });

  it('two segments are joined without separator (adjacent colored blocks)', () => {
    const seg1 = makeSeg('a', [30, 41, 59]);
    const seg2 = makeSeg('b', [51, 65, 85]);
    const out = renderer.render([seg1, seg2], 200, spacesCfg);
    expect(out).toContain(RESET + ansi48(51, 65, 85));
  });

  it('does not contain powerline arrow in spaces mode', () => {
    const seg1 = makeSeg('a');
    const seg2 = makeSeg('b');
    const out = renderer.render([seg1, seg2], 200, spacesCfg);
    expect(out).not.toContain(POWERLINE_ARROW);
  });

  it('wraps to new line when segments exceed terminal width', () => {
    const long = makeSeg('a'.repeat(40));
    const out = renderer.render([long, long], 50, spacesCfg);
    expect(out).toContain('\n');
  });

  it('no wrap when width is 0 (disabled)', () => {
    const seg1 = makeSeg('a'.repeat(40));
    const seg2 = makeSeg('b'.repeat(40));
    const out = renderer.render([seg1, seg2], 0, spacesCfg);
    expect(out).not.toContain('\n');
  });

  it('all values appear somewhere in the output', () => {
    const segs = [makeSeg('alpha'), makeSeg('beta'), makeSeg('gamma')];
    const out = renderer.render(segs, 200, spacesCfg);
    expect(out).toContain('alpha');
    expect(out).toContain('beta');
    expect(out).toContain('gamma');
  });
});

// ────────────────────────────────────────────────────────
// Powerline mode
// ────────────────────────────────────────────────────────

describe('StatusRenderer — powerline mode', () => {
  it('single segment contains 24-bit bg ANSI code', () => {
    const seg = makeSeg('hello', [30, 41, 59]);
    const out = renderer.render([seg], 200, powerlineCfg);
    expect(out).toContain(ansi48(30, 41, 59));
  });

  it('single segment contains trailing powerline arrow', () => {
    const seg = makeSeg('hello');
    const out = renderer.render([seg], 200, powerlineCfg);
    expect(out).toContain(POWERLINE_ARROW);
  });

  it('single segment: trailing arrow uses segment bg as fg', () => {
    const bg: [number, number, number] = [30, 41, 59];
    const seg = makeSeg('hello', bg);
    const out = renderer.render([seg], 200, powerlineCfg);
    expect(out).toContain(ansi38(30, 41, 59) + POWERLINE_ARROW + RESET);
  });

  it('two segments: transition uses prev bg as fg and next bg as bg', () => {
    const bg1: [number, number, number] = [30, 41, 59];
    const bg2: [number, number, number] = [51, 65, 85];
    const seg1 = makeSeg('a', bg1);
    const seg2 = makeSeg('b', bg2);
    const out = renderer.render([seg1, seg2], 200, powerlineCfg);
    const transition = `${ansi38(30, 41, 59)}${ansi48(51, 65, 85)}${POWERLINE_ARROW}`;
    expect(out).toContain(transition);
  });

  it('two segments: trailing arrow uses last segment bg', () => {
    const bg2: [number, number, number] = [51, 65, 85];
    const seg1 = makeSeg('a');
    const seg2 = makeSeg('b', bg2);
    const out = renderer.render([seg1, seg2], 200, powerlineCfg);
    expect(out).toContain(ansi38(51, 65, 85) + POWERLINE_ARROW + RESET);
  });

  it('N segments have N-1 arrow transitions plus 1 trailing arrow', () => {
    const segs = [makeSeg('a'), makeSeg('b'), makeSeg('c')];
    const out = renderer.render(segs, 200, powerlineCfg);
    const arrowCount = out.split(POWERLINE_ARROW).length - 1;
    expect(arrowCount).toBe(3);
  });

  it('contains bold for segment content', () => {
    const out = renderer.render([makeSeg('x')], 200, powerlineCfg);
    expect(out).toContain(BOLD);
  });

  it('all segment values appear in powerline output', () => {
    const segs = [makeSeg('alpha'), makeSeg('beta'), makeSeg('gamma')];
    const out = renderer.render(segs, 200, powerlineCfg);
    expect(out).toContain('alpha');
    expect(out).toContain('beta');
    expect(out).toContain('gamma');
  });

  it('wraps to new line when segments exceed terminal width', () => {
    const long = makeSeg('a'.repeat(40));
    const out = renderer.render([long, long], 50, powerlineCfg);
    expect(out).toContain('\n');
  });

  it('no wrap when width is 0 (disabled)', () => {
    const seg1 = makeSeg('a'.repeat(40));
    const seg2 = makeSeg('b'.repeat(40));
    const out = renderer.render([seg1, seg2], 0, powerlineCfg);
    expect(out).not.toContain('\n');
  });

  it('each wrapped line ends with trailing arrow + reset', () => {
    const long = makeSeg('a'.repeat(40));
    const out = renderer.render([long, long], 50, powerlineCfg);
    for (const line of out.split('\n')) {
      expect(line).toContain(POWERLINE_ARROW);
      expect(line.endsWith(RESET)).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────
// Mode dispatch
// ────────────────────────────────────────────────────────

describe('StatusRenderer — mode dispatch', () => {
  it('spaces mode does not contain powerline arrows', () => {
    const segs = [makeSeg('a'), makeSeg('b')];
    const out = renderer.render(segs, 200, spacesCfg);
    expect(out).not.toContain(POWERLINE_ARROW);
  });

  it('powerline mode contains powerline arrows', () => {
    const segs = [makeSeg('a'), makeSeg('b')];
    const out = renderer.render(segs, 200, powerlineCfg);
    expect(out).toContain(POWERLINE_ARROW);
  });
});
