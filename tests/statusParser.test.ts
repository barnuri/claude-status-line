import { describe, it, expect } from 'bun:test';
import { StatusParser } from '../src/statusParser.ts';

const parser = new StatusParser();

describe('StatusParser.parse', () => {
  it('returns empty object for empty string', () => {
    expect(parser.parse('')).toEqual({});
  });

  it('returns empty object for whitespace-only input', () => {
    expect(parser.parse('   \n  ')).toEqual({});
  });

  it('returns empty object for invalid JSON', () => {
    expect(parser.parse('{not json}')).toEqual({});
  });

  it('parses valid StatusJSON', () => {
    const result = parser.parse('{"model":"claude-sonnet-4-6"}');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('handles partial JSON (some fields)', () => {
    const result = parser.parse('{"cwd":"/home/user"}');
    expect(result.cwd).toBe('/home/user');
    expect(result.model).toBeUndefined();
  });
});

describe('StatusParser.buildSegments — folder', () => {
  it('extracts basename of cwd', () => {
    const segments = parser.buildSegments({ cwd: '/home/user/projects/my-app' });
    const folder = segments.find(s => s.bg === 'bgBlue');
    expect(folder?.value).toBe('my-app');
  });

  it('falls back to workspace.current_dir when cwd is absent', () => {
    const segments = parser.buildSegments({ workspace: { current_dir: '/var/repos/backend' } });
    const folder = segments.find(s => s.bg === 'bgBlue');
    expect(folder?.value).toBe('backend');
  });

  it('omits folder segment when neither cwd nor workspace is present', () => {
    const segments = parser.buildSegments({ model: 'claude-sonnet-4-6' });
    expect(segments.find(s => s.bg === 'bgBlue')).toBeUndefined();
  });
});

describe('StatusParser.buildSegments — model', () => {
  it('includes model segment when present', () => {
    const segments = parser.buildSegments({ model: 'claude-sonnet-4-6' });
    const model = segments.find(s => s.bg === 'bgMagenta');
    expect(model?.value).toBe('claude-sonnet-4-6');
  });

  it('omits model segment when absent', () => {
    const segments = parser.buildSegments({ cwd: '/tmp' });
    expect(segments.find(s => s.bg === 'bgMagenta')).toBeUndefined();
  });
});

describe('StatusParser.buildSegments — context', () => {
  it('uses percentage field directly', () => {
    const segments = parser.buildSegments({ context_window: { percentage: 42 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.value).toBe('42%');
  });

  it('computes percentage from tokens + size', () => {
    const segments = parser.buildSegments({ context_window: { tokens: 100000, size: 200000 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.value).toBe('50%');
  });

  it('uses token_count when tokens is absent', () => {
    const segments = parser.buildSegments({ context_window: { token_count: 50000, size: 200000 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.value).toBe('25%');
  });

  it('uses green bg when context < 60%', () => {
    const segments = parser.buildSegments({ context_window: { percentage: 30 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.bg).toBe('bgGreen');
  });

  it('uses yellow bg when context between 60–80%', () => {
    const segments = parser.buildSegments({ context_window: { percentage: 70 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.bg).toBe('bgYellow');
  });

  it('uses red bg when context > 80%', () => {
    const segments = parser.buildSegments({ context_window: { percentage: 85 } });
    const ctx = segments.find(s => s.label === 'ctx');
    expect(ctx?.bg).toBe('bgRed');
  });

  it('omits context segment when context_window is absent', () => {
    const segments = parser.buildSegments({ model: 'x' });
    expect(segments.find(s => s.label === 'ctx')).toBeUndefined();
  });

  it('omits context segment when size is 0 and percentage absent', () => {
    const segments = parser.buildSegments({ context_window: { tokens: 100, size: 0 } });
    expect(segments.find(s => s.label === 'ctx')).toBeUndefined();
  });
});

describe('StatusParser.buildSegments — tokens', () => {
  it('formats tokens in thousands', () => {
    const segments = parser.buildSegments({ context_window: { tokens: 85000 } });
    const tok = segments.find(s => s.label === 'tokens');
    expect(tok?.value).toBe('85.0k');
  });

  it('formats tokens in millions', () => {
    const segments = parser.buildSegments({ context_window: { tokens: 1500000 } });
    const tok = segments.find(s => s.label === 'tokens');
    expect(tok?.value).toBe('1.5M');
  });

  it('formats small token counts as plain number', () => {
    const segments = parser.buildSegments({ context_window: { tokens: 500 } });
    const tok = segments.find(s => s.label === 'tokens');
    expect(tok?.value).toBe('500');
  });

  it('falls back to token_count when tokens absent', () => {
    const segments = parser.buildSegments({ context_window: { token_count: 12000 } });
    const tok = segments.find(s => s.label === 'tokens');
    expect(tok?.value).toBe('12.0k');
  });
});

describe('StatusParser.buildSegments — rate limits', () => {
  it('computes remaining % from used/limit', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { used: 30, limit: 100 } } });
    const seg = segments.find(s => s.label === 'session');
    expect(seg?.value).toBe('70%');
  });

  it('computes remaining % from remaining/limit fields', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { remaining: 40, limit: 100 } } });
    const seg = segments.find(s => s.label === 'session');
    expect(seg?.value).toBe('40%');
  });

  it('inverts percentage field (remaining = 100 - pct)', () => {
    const segments = parser.buildSegments({ rate_limits: { week: { percentage: 60 } } });
    const seg = segments.find(s => s.label === 'week');
    expect(seg?.value).toBe('40%');
  });

  it('uses blue bg when remaining >= 50%', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { used: 20, limit: 100 } } });
    const seg = segments.find(s => s.label === 'session');
    expect(seg?.bg).toBe('bgCyan');
  });

  it('uses yellow bg when remaining 20–49%', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { used: 65, limit: 100 } } });
    const seg = segments.find(s => s.label === 'session');
    expect(seg?.bg).toBe('bgYellow');
  });

  it('uses red bg when remaining < 20%', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { used: 85, limit: 100 } } });
    const seg = segments.find(s => s.label === 'session');
    expect(seg?.bg).toBe('bgRed');
  });

  it('includes known keys (session, week, day) before unknown keys', () => {
    const segments = parser.buildSegments({
      rate_limits: {
        custom: { used: 10, limit: 100 },
        session: { used: 20, limit: 100 },
      },
    });
    const labels = segments.filter(s => s.label === 'session' || s.label === 'custom').map(s => s.label);
    expect(labels[0]).toBe('session');
    expect(labels[1]).toBe('custom');
  });

  it('omits rate limit segment when limit is 0 (division by zero guard)', () => {
    const segments = parser.buildSegments({ rate_limits: { session: { used: 50, limit: 0 } } });
    expect(segments.find(s => s.label === 'session')).toBeUndefined();
  });

  it('omits rate limits section when rate_limits is absent', () => {
    const segments = parser.buildSegments({ model: 'x' });
    expect(segments.find(s => s.label === 'session')).toBeUndefined();
    expect(segments.find(s => s.label === 'week')).toBeUndefined();
  });

  it('handles day rate limit', () => {
    const segments = parser.buildSegments({ rate_limits: { day: { used: 50, limit: 100 } } });
    const seg = segments.find(s => s.label === 'day');
    expect(seg?.value).toBe('50%');
  });
});

describe('StatusParser.buildSegments — segment ordering', () => {
  it('returns segments in order: folder, model, ctx, tokens, rate-limits', () => {
    const segments = parser.buildSegments({
      cwd: '/projects/app',
      model: 'claude-sonnet-4-6',
      context_window: { percentage: 30, tokens: 60000 },
      rate_limits: { session: { used: 20, limit: 100 } },
    });
    const labels = segments.map(s => s.label || s.value);
    expect(labels[0]).toBe('app');
    expect(labels[1]).toBe('claude-sonnet-4-6');
    expect(labels[2]).toBe('ctx');
    expect(labels[3]).toBe('tokens');
    expect(labels[4]).toBe('session');
  });
});

describe('StatusParser.buildSegments — empty input', () => {
  it('returns empty array for completely empty status', () => {
    expect(parser.buildSegments({})).toEqual([]);
  });
});
