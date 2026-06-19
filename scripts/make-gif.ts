#!/usr/bin/env bun
/**
 * Combines individual PNG frames into an animated GIF.
 * Usage: bun run scripts/make-gif.ts
 * Reads docs/frame-*.png, writes docs/demo.gif
 */

import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

const FRAME_DELAY_MS = 2000;

const FRAME_FILES = [
  'docs/frame-0-healthy.png',
  'docs/frame-1-warning.png',
  'docs/frame-2-critical.png',
  'docs/frame-3-wrapped.png',
];

function decodePng(filePath: string): { data: Uint8Array; width: number; height: number } {
  const buffer = fs.readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  return {
    data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength),
    width: png.width,
    height: png.height,
  };
}

function padToSize(
  data: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Uint8Array {
  if (srcWidth === dstWidth && srcHeight === dstHeight) {
    return data;
  }
  const padded = new Uint8Array(dstWidth * dstHeight * 4).fill(0x28);
  for (let y = 0; y < srcHeight && y < dstHeight; y++) {
    const srcOff = y * srcWidth * 4;
    const dstOff = y * dstWidth * 4;
    padded.set(data.slice(srcOff, srcOff + Math.min(srcWidth, dstWidth) * 4), dstOff);
  }
  return padded;
}

const frames = FRAME_FILES.map(f => decodePng(f));

const maxWidth = Math.max(...frames.map(f => f.width));
const maxHeight = Math.max(...frames.map(f => f.height));

const gif = GIFEncoder();

for (const frame of frames) {
  const rgba = padToSize(frame.data, frame.width, frame.height, maxWidth, maxHeight);
  const palette = quantize(rgba, 256);
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, maxWidth, maxHeight, { palette, delay: FRAME_DELAY_MS, repeat: 0 });
}

gif.finish();

const outPath = 'docs/demo.gif';
fs.writeFileSync(outPath, Buffer.from(gif.bytes()));
console.log(`GIF written to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
