import type { Segment } from './types.ts';
import { ANSI_COLOR } from './types.ts';

const SEPARATOR = ' | ';

export class StatusRenderer {
  render(segments: Segment[], terminalWidth: number): string {
    if (segments.length === 0) {
      return '';
    }

    const parts = segments.map(seg => this.formatSegment(seg));
    const plainParts = segments.map(seg => this.plainText(seg));

    return this.wrapLines(parts, plainParts, terminalWidth);
  }

  private formatSegment(seg: Segment): string {
    const color = ANSI_COLOR[seg.color];
    const text = seg.label ? `${seg.label}: ${seg.value}` : seg.value;
    return `${color}${text}${ANSI_COLOR.reset}`;
  }

  private plainText(seg: Segment): string {
    return seg.label ? `${seg.label}: ${seg.value}` : seg.value;
  }

  private wrapLines(
    coloredParts: readonly string[],
    plainParts: readonly string[],
    terminalWidth: number,
  ): string {
    const lines: string[] = [];
    let currentLineColored: string[] = [];
    let currentLineWidth = 0;

    for (let i = 0; i < coloredParts.length; i++) {
      const colored = coloredParts[i] ?? '';
      const plain = plainParts[i] ?? '';
      const addWidth = currentLineColored.length === 0
        ? plain.length
        : SEPARATOR.length + plain.length;

      const fitsOnLine = terminalWidth <= 0 || (currentLineWidth + addWidth) <= terminalWidth;

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

    return lines.join('\n');
  }
}
