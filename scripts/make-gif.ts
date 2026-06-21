#!/usr/bin/env bun
/**
 * Combines PNG frames into an animated GIF using ffmpeg palette optimization.
 * Usage: bun run scripts/make-gif.ts
 * Requires: ffmpeg and ffprobe in PATH
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';

const FRAME_DELAY_S = 2.5;
const BG_COLOR = '0x282a36';
const OUT_PATH = 'docs/demo.gif';

const FRAME_FILES = [
  'docs/frame-0-healthy.png',
  'docs/frame-1-warning.png',
  'docs/frame-2-critical.png',
  'docs/frame-3-wrapped.png',
];

interface Dimensions {
  readonly width: number;
  readonly height: number;
}

class GifMaker {
  run(): void {
    this.checkFrames();
    this.checkFfmpeg();

    const dims = FRAME_FILES.map(f => this.getFrameDimensions(f));
    const maxWidth = Math.max(...dims.map(d => d.width));
    const maxHeight = Math.max(...dims.map(d => d.height));

    const args = this.buildFfmpegArgs(maxWidth, maxHeight);
    execFileSync('ffmpeg', args, { stdio: 'ignore' });

    const sizeKb = (fs.statSync(OUT_PATH).size / 1024).toFixed(0);
    console.log(`GIF written to ${OUT_PATH} (${sizeKb} KB)`);
  }

  private checkFrames(): void {
    const missing = FRAME_FILES.filter(f => !fs.existsSync(f));
    if (missing.length > 0) {
      console.error(`Missing frames:\n${missing.join('\n')}`);
      console.error('Run: bun run scripts/capture-screenshots.ts');
      process.exit(1);
    }
  }

  private checkFfmpeg(): void {
    try {
      execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    } catch {
      console.error('ffmpeg not found in PATH — install ffmpeg to continue');
      process.exit(1);
    }
  }

  private getFrameDimensions(filePath: string): Dimensions {
    const out = execFileSync('ffprobe', [
      '-v', 'quiet',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0',
      filePath,
    ]).toString().trim();
    const [w, h] = out.split(',').map(Number);
    if (!w || !h) { throw new Error(`Failed to read dimensions from ${filePath}`); }
    return { width: w, height: h };
  }

  private buildFfmpegArgs(maxWidth: number, maxHeight: number): string[] {
    const inputArgs = FRAME_FILES.flatMap(f => [
      '-loop', '1', '-t', String(FRAME_DELAY_S), '-i', f,
    ]);

    const scaleEach = FRAME_FILES.map((_, i) =>
      `[${i}:v]scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease,` +
      `pad=${maxWidth}:${maxHeight}:0:0:color=${BG_COLOR}[v${i}]`,
    ).join(';');

    const concatInputs = FRAME_FILES.map((_, i) => `[v${i}]`).join('');
    const filterComplex =
      `${scaleEach};` +
      `${concatInputs}concat=n=${FRAME_FILES.length}:v=1[v];` +
      `[v]fps=10,split[a][b];` +
      `[a]palettegen=max_colors=256:stats_mode=full[p];` +
      `[b][p]paletteuse=dither=sierra2_4a`;

    return [
      '-y',
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-loop', '0',
      OUT_PATH,
    ];
  }
}

new GifMaker().run();
