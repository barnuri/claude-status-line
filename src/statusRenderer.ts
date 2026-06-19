import type { Segment } from './types.ts';
import { ANSI } from './types.ts';

export class StatusRenderer {
  private static readonly SEPARATOR = '  ';
  private static readonly SEGMENT_PAD = ' ';

  render(segments: Segment[], terminalWidth: number): string {
    if (segments.length === 0) {
      return '';
    }

    const colored = segments.map(seg => this.formatSegment(seg));
    const plain = segments.map(seg => this.plainWidth(seg));

    return this.wrapLines(colored, plain, terminalWidth);
  }

  private formatSegment(seg: Segment): string {
    const p = StatusRenderer.SEGMENT_PAD;
    const text = seg.label ? `${seg.icon}${seg.label}: ${seg.value}` : `${seg.icon}${seg.value}`;
    return `${ANSI[seg.bg]}${ANSI[seg.fg]}${ANSI.bold}${p}${text}${p}${ANSI.reset}`;
  }

  private plainWidth(seg: Segment): number {
    const p = StatusRenderer.SEGMENT_PAD;
    const text = seg.label ? `${seg.icon}${seg.label}: ${seg.value}` : `${seg.icon}${seg.value}`;
    return p.length + text.length + p.length;
  }

  private wrapLines(
    coloredParts: readonly string[],
    plainWidths: readonly number[],
    terminalWidth: number,
  ): string {
    const lines: string[] = [];
    let currentLine: string[] = [];
    let currentWidth = 0;

    for (let i = 0; i < coloredParts.length; i++) {
      const colored = coloredParts[i] ?? '';
      const segWidth = plainWidths[i] ?? 0;
      const addWidth = currentLine.length === 0
        ? segWidth
        : StatusRenderer.SEPARATOR.length + segWidth;

      const fits = terminalWidth <= 0 || (currentWidth + addWidth) <= terminalWidth;

      if (!fits && currentLine.length > 0) {
        lines.push(currentLine.join(StatusRenderer.SEPARATOR));
        currentLine = [colored];
        currentWidth = segWidth;
      } else {
        currentLine.push(colored);
        currentWidth += addWidth;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.join(StatusRenderer.SEPARATOR));
    }

    return lines.join('\n');
  }
}
