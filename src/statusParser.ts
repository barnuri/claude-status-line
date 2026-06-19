import type { StatusJSON, Segment, RateLimit } from './types.ts';
import { ANSI_COLOR } from './types.ts';
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
      segments.push({ label: '', value: folder, color: 'cyan' });
    }

    const model = this.extractModel(status);
    if (model) {
      segments.push({ label: '', value: model, color: 'yellow' });
    }

    const contextPercent = this.extractContextPercent(status);
    if (contextPercent !== null) {
      segments.push({ label: 'ctx', value: `${contextPercent}%`, color: 'green' });
    }

    const tokenCount = this.extractTokenCount(status);
    if (tokenCount !== null) {
      segments.push({ label: 'tokens', value: this.formatTokens(tokenCount), color: 'magenta' });
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

      const pct = this.calcRemainingPercent(limit);
      if (pct === null) { continue; }

      const color = pct < 20 ? 'red' : pct < 50 ? 'yellow' : 'blue';
      segments.push({ label: key, value: `${pct}%`, color });
    }

    for (const key of Object.keys(limits)) {
      if (knownKeys.includes(key)) { continue; }
      const limit = limits[key];
      if (!limit) { continue; }

      const pct = this.calcRemainingPercent(limit);
      if (pct === null) { continue; }

      const color = pct < 20 ? 'red' : pct < 50 ? 'yellow' : 'blue';
      segments.push({ label: key, value: `${pct}%`, color });
    }

    return segments;
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
