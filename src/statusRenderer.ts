import type { Segment, Config, RgbColor } from './types.ts';
import { ANSI } from './types.ts';

export class StatusRenderer {
  private static readonly SEPARATOR = '';
  private static readonly POWERLINE_ARROW = '❯';

  render(segments: Segment[], terminalWidth: number, config: Config): string {
    if (segments.length === 0) {
      return '';
    }
    if (config.separatorStyle === 'powerline') {
      return this.renderPowerline(segments, terminalWidth);
    }
    return this.renderSpaces(segments, terminalWidth);
  }

  private renderSpaces(segments: Segment[], terminalWidth: number): string {
    const lines = this.groupIntoLines(segments, terminalWidth, StatusRenderer.SEPARATOR.length);
    return lines
      .map(lineSegs => lineSegs.map(seg => this.formatSegmentSpaces(seg)).join(StatusRenderer.SEPARATOR))
      .join('\n');
  }

  private renderPowerline(segments: Segment[], terminalWidth: number): string {
    const lines = this.groupIntoLines(segments, terminalWidth, 1);
    return lines.map(lineSegs => this.renderPowerlineLine(lineSegs)).join('\n');
  }

  private groupIntoLines(segments: Segment[], terminalWidth: number, separatorWidth: number): Segment[][] {
    const lines: Segment[][] = [[]];
    let currentWidth = 0;

    for (const seg of segments) {
      const segW = this.plainWidth(seg);
      const currentLine = lines[lines.length - 1]!;
      const addW = currentLine.length === 0 ? segW : separatorWidth + segW;
      const fits = terminalWidth <= 0 || currentWidth + addW <= terminalWidth;

      if (!fits && currentLine.length > 0) {
        lines.push([seg]);
        currentWidth = segW;
      } else {
        currentLine.push(seg);
        currentWidth += addW;
      }
    }

    return lines.filter(line => line.length > 0);
  }

  private formatSegmentSpaces(seg: Segment): string {
    const text = seg.label ? `${seg.icon}${seg.label}: ${seg.value}` : `${seg.icon}${seg.value}`;
    return `${this.ansi48(seg.bg)}${this.ansi38(seg.fg)}${ANSI.bold} ${text} ${ANSI.reset}`;
  }

  private renderPowerlineLine(segs: Segment[]): string {
    if (segs.length === 0) {
      return '';
    }

    const ARROW = StatusRenderer.POWERLINE_ARROW;
    let result = '';

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      const text = seg.label ? `${seg.icon}${seg.label}: ${seg.value}` : `${seg.icon}${seg.value}`;

      if (i === 0) {
        result += `${this.ansi48(seg.bg)}${this.ansi38(seg.fg)}${ANSI.bold} ${text} `;
      } else {
        const prevSeg = segs[i - 1]!;
        result += `${ANSI.reset}${this.ansi38(prevSeg.bg)}${this.ansi48(seg.bg)}${ARROW}`;
        result += `${this.ansi38(seg.fg)}${ANSI.bold} ${text} `;
      }
    }

    const lastSeg = segs[segs.length - 1]!;
    result += `${ANSI.reset}${this.ansi38(lastSeg.bg)}${ARROW}${ANSI.reset}`;

    return result;
  }

  private plainWidth(seg: Segment): number {
    const text = seg.label ? `${seg.icon}${seg.label}: ${seg.value}` : `${seg.icon}${seg.value}`;
    return 1 + text.length + 1;
  }

  private ansi38(color: RgbColor): string {
    return `\x1b[38;2;${color[0]};${color[1]};${color[2]}m`;
  }

  private ansi48(color: RgbColor): string {
    return `\x1b[48;2;${color[0]};${color[1]};${color[2]}m`;
  }
}
