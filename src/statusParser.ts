import type { StatusJSON, Segment, RateLimit } from './types.ts';
import * as path from 'path';

export class StatusParser {
  parse(raw: string): StatusJSON {
    if (!raw.trim()) {
      return {};
    }
    try {
      return JSON.parse(raw) as StatusJSON;
    } catch {
      return {};
    }
  }

  buildSegments(status: StatusJSON): Segment[] {
    const segments: Segment[] = [];

    const folder = this.extractFolder(status);
    if (folder) {
      segments.push({ icon: '󰉋 ', label: '', value: folder, fg: 'fgBrightWhite', bg: 'bgBlue' });
    }

    const model = this.extractModel(status);
    if (model) {
      segments.push({ icon: '󰚩 ', label: '', value: model, fg: 'fgBrightWhite', bg: 'bgMagenta' });
    }

    const contextPercent = this.extractContextPercent(status);
    if (contextPercent !== null) {
      const bg = contextPercent > 80 ? 'bgRed' : contextPercent > 60 ? 'bgYellow' : 'bgGreen';
      const fg = contextPercent > 60 ? 'fgBlack' : 'fgBrightWhite';
      segments.push({ icon: '󰔚 ', label: 'ctx', value: `${contextPercent}%`, fg, bg });
    }

    const tokenCount = this.extractTokenCount(status);
    if (tokenCount !== null) {
      segments.push({ icon: '󰑃 ', label: 'tokens', value: this.formatTokens(tokenCount), fg: 'fgBrightWhite', bg: 'bgBrightBlack' });
    }

    const rateLimitSegments = this.extractRateLimits(status);
    segments.push(...rateLimitSegments);

    return segments;
  }

  private extractFolder(status: StatusJSON): string | null {
    const dir = status.cwd ?? status.workspace?.current_dir;
    if (!dir) { return null; }
    return path.basename(dir);
  }

  private extractModel(status: StatusJSON): string | null {
    return status.model ?? null;
  }

  private extractContextPercent(status: StatusJSON): number | null {
    const ctx = status.context_window;
    if (!ctx) { return null; }

    if (typeof ctx.percentage === 'number') {
      return Math.round(ctx.percentage);
    }

    const tokens = ctx.tokens ?? ctx.token_count ?? ctx.input;
    const size = ctx.size;
    if (typeof tokens === 'number' && typeof size === 'number' && size > 0) {
      return Math.round((tokens / size) * 100);
    }

    return null;
  }

  private extractTokenCount(status: StatusJSON): number | null {
    const ctx = status.context_window;
    if (!ctx) { return null; }
    return ctx.tokens ?? ctx.token_count ?? ctx.input ?? null;
  }

  private extractRateLimits(status: StatusJSON): Segment[] {
    const limits = status.rate_limits;
    if (!limits) { return []; }

    const knownKeys: ReadonlyArray<string> = ['session', 'week', 'day'];
    const segments: Segment[] = [];

    for (const key of knownKeys) {
      const limit = limits[key];
      if (!limit) { continue; }
      const seg = this.buildRateLimitSegment(key, limit);
      if (seg) { segments.push(seg); }
    }

    for (const key of Object.keys(limits)) {
      if (knownKeys.includes(key)) { continue; }
      const limit = limits[key];
      if (!limit) { continue; }
      const seg = this.buildRateLimitSegment(key, limit);
      if (seg) { segments.push(seg); }
    }

    return segments;
  }

  private buildRateLimitSegment(key: string, limit: RateLimit): Segment | null {
    const pct = this.calcRemainingPercent(limit);
    if (pct === null) { return null; }

    const icon = key === 'session' ? '⏱ ' : key === 'week' ? '📅 ' : '⚡ ';
    const bg = pct < 20 ? 'bgRed' : pct < 50 ? 'bgYellow' : 'bgCyan';
    const fg = pct < 50 ? 'fgBlack' : 'fgBrightWhite';

    return { icon, label: key, value: `${pct}%`, fg, bg };
  }

  private calcRemainingPercent(limit: RateLimit): number | null {
    if (typeof limit.percentage === 'number') {
      return Math.round(100 - limit.percentage);
    }
    if (typeof limit.remaining === 'number' && typeof limit.limit === 'number' && limit.limit > 0) {
      return Math.round((limit.remaining / limit.limit) * 100);
    }
    if (typeof limit.used === 'number' && typeof limit.limit === 'number' && limit.limit > 0) {
      return Math.round(((limit.limit - limit.used) / limit.limit) * 100);
    }
    return null;
  }

  private formatTokens(count: number): string {
    if (count >= 1_000_000) { return `${(count / 1_000_000).toFixed(1)}M`; }
    if (count >= 1_000) { return `${(count / 1_000).toFixed(1)}k`; }
    return String(count);
  }
}
