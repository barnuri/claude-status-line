#!/usr/bin/env bun
/**
 * Captures PNG screenshots of each demo scenario from preview.html.
 * Writes docs/frame-{0..3}-*.png and docs/screenshot-all-scenarios.png.
 * Usage: bun run scripts/capture-screenshots.ts
 * Requires: bunx playwright install chromium
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const PREVIEW_HTML = path.resolve('docs/preview.html');
const DOCS_DIR = 'docs';

const FRAME_DEFS = [
  { index: 0, slug: 'healthy' },
  { index: 1, slug: 'warning' },
  { index: 2, slug: 'critical' },
  { index: 3, slug: 'wrapped' },
] as const;

class ScreenshotCapture {
  async run(): Promise<void> {
    if (!fs.existsSync(PREVIEW_HTML)) {
      console.error('docs/preview.html not found — run: bun run scripts/preview.ts');
      process.exit(1);
    }

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto(`file://${PREVIEW_HTML}`);
      await page.waitForLoadState('networkidle');

      await this.captureFullPage(page);
      await this.captureFrames(page);
    } finally {
      await browser.close();
    }
  }

  private async captureFullPage(page: import('playwright').Page): Promise<void> {
    const outPath = path.join(DOCS_DIR, 'screenshot-all-scenarios.png');
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: 1400, height: bodyHeight });
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved ${outPath}`);
  }

  private async captureFrames(page: import('playwright').Page): Promise<void> {
    for (const frame of FRAME_DEFS) {
      const el = page.locator('.scenario').nth(frame.index);
      const outPath = path.join(DOCS_DIR, `frame-${frame.index}-${frame.slug}.png`);
      await el.screenshot({ path: outPath });
      console.log(`Saved ${outPath}`);
    }
  }
}

new ScreenshotCapture().run().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
