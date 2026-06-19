import { describe, it, expect } from 'bun:test';
import { StatusRenderer } from '../src/statusRenderer.ts';
import type { Segment } from '../src/types.ts';

const renderer = new StatusRenderer();

function seg(value: string, label = ''): Segment {
  return { icon: '● ', label, value, fg: 'fgBrightWhite', bg: 'bgBlue' };
}

describe('StatusRenderer.render — empty', () => {
  it('returns empty string for empty segment array', () => {
    expect(renderer.render([], 200)).toBe('');
  });
});

describe('StatusRenderer.render — single segment', () => {
  it('renders one segment without separator', () => {
    const output = renderer.render([seg('my-app')], 200);
    expect(output).toContain('my-app');
    expect(output).not.toContain(' | ');
  });

  it('contains ANSI color codes', () => {
    const output = renderer.render([seg('my-app')], 200);
    expect(output).toContain('\x1b[');
  });

  it('contains bold code', () => {
    const output = renderer.render([seg('my-app')], 200);
    expect(output).toContain('\x1b[1m');
  });

  it('ends with reset code followed by newline via caller', () => {
    const output = renderer.render([seg('my-app')], 200);
    expect(output).toContain('\x1b[0m');
  });
});

describe('StatusRenderer.render — multiple segments, wide terminal', () => {
  it('joins segments with separator on a single line', () => {
    const output = renderer.render([seg('folder'), seg('model')], 500);
    const lines = output.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('contains separator between segments', () => {
    const output = renderer.render([seg('a'), seg('b')], 500);
    expect(output).toContain('  ');
  });

  it('renders all values', () => {
    const output = renderer.render([seg('folder'), seg('sonnet')], 500);
    expect(output).toContain('folder');
    expect(output).toContain('sonnet');
  });
});

describe('StatusRenderer.render — labelled segment', () => {
  it('includes label: value format', () => {
    const output = renderer.render([seg('42%', 'ctx')], 200);
    expect(output).toContain('ctx: 42%');
  });
});

describe('StatusRenderer.render — wrapping', () => {
  it('wraps to second line when content exceeds terminal width', () => {
    const segments = [
      seg('my-app'),
      seg('claude-sonnet-4-6'),
      seg('42%', 'ctx'),
      seg('85.0k', 'tokens'),
    ];
    const output = renderer.render(segments, 30);
    const lines = output.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('places all content on one line when terminal width is 0 (unlimited)', () => {
    const segments = [seg('a'), seg('b'), seg('c'), seg('d'), seg('e')];
    const output = renderer.render(segments, 0);
    expect(output.split('\n')).toHaveLength(1);
  });

  it('never truncates — every value appears somewhere in the output', () => {
    const segments = [seg('alpha'), seg('beta'), seg('gamma'), seg('delta'), seg('epsilon')];
    const output = renderer.render(segments, 10);
    for (const s of segments) {
      expect(output).toContain(s.value);
    }
  });

  it('single oversized segment goes on its own line without crashing', () => {
    const longSeg = seg('a-very-long-folder-name-that-exceeds-width');
    const output = renderer.render([longSeg, seg('x')], 5);
    expect(output).toContain('a-very-long-folder-name-that-exceeds-width');
    expect(output).toContain('x');
  });

  it('does not wrap when content fits exactly', () => {
    const s = seg('ab');
    const output = renderer.render([s], 6);
    expect(output.split('\n')).toHaveLength(1);
  });

  it('wraps to multiple lines for very narrow terminal', () => {
    const segments = [seg('a'), seg('b'), seg('c'), seg('d')];
    const output = renderer.render(segments, 1);
    expect(output.split('\n')).toHaveLength(4);
  });
});

describe('StatusRenderer.render — ANSI correctness', () => {
  it('resets after each segment', () => {
    const output = renderer.render([seg('a'), seg('b')], 200);
    const resetCount = (output.match(/\x1b\[0m/g) ?? []).length;
    expect(resetCount).toBeGreaterThanOrEqual(2);
  });

  it('applies background color from segment', () => {
    const s: Segment = { icon: '', label: '', value: 'x', fg: 'fgBrightWhite', bg: 'bgRed' };
    const output = renderer.render([s], 200);
    expect(output).toContain('\x1b[41m');
  });

  it('applies foreground color from segment', () => {
    const s: Segment = { icon: '', label: '', value: 'x', fg: 'fgBlack', bg: 'bgGreen' };
    const output = renderer.render([s], 200);
    expect(output).toContain('\x1b[30m');
    expect(output).toContain('\x1b[42m');
  });
});
