#!/usr/bin/env bun
/**
 * Regenerates all demo assets: preview HTML, screenshots, and animated GIF.
 * Usage: bun run scripts/update-all.ts
 * Requires: ffmpeg in PATH, playwright installed (bunx playwright install chromium)
 */

import { execFileSync } from 'child_process';
import * as path from 'path';

const BUN = process.execPath;
const SCRIPTS = path.resolve('scripts');

class AssetUpdater {
  run(): void {
    this.step('preview HTML', [path.join(SCRIPTS, 'preview.ts')]);
    this.step('animated HTML', [path.join(SCRIPTS, 'animated-preview.ts')]);
    this.step('screenshots', [path.join(SCRIPTS, 'capture-screenshots.ts')]);
    this.step('GIF', [path.join(SCRIPTS, 'make-gif.ts')]);
    console.log('\nAll demo assets updated.');
  }

  private step(label: string, args: readonly string[]): void {
    console.log(`\n→ Generating ${label}…`);
    execFileSync(BUN, ['run', ...args], { stdio: 'inherit' });
  }
}

new AssetUpdater().run();
