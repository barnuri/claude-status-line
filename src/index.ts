#!/usr/bin/env bun
import { StatusParser } from './statusParser.ts';
import { StatusRenderer } from './statusRenderer.ts';
import { SetupWizard } from './setupWizard.ts';

class Application {
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const isSetup = args.includes('--setup');

    if (isSetup || process.stdin.isTTY) {
      await new SetupWizard().run();
      return;
    }

    const raw = await this.readStdin();
    const parser = new StatusParser();
    const status = parser.parse(raw);
    const segments = parser.buildSegments(status);

    const terminalWidth = this.resolveTerminalWidth();
    const output = new StatusRenderer().render(segments, terminalWidth);

    if (output) {
      process.stdout.write(output + '\n');
    }
  }

  private resolveTerminalWidth(): number {
    if (process.stdout.columns) {
      return process.stdout.columns;
    }
    const envCols = parseInt(process.env['COLUMNS'] ?? '', 10);
    return isNaN(envCols) ? 0 : envCols;
  }

  private async readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}

new Application().run().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`claude-status-line error: ${message}\n`);
  process.exit(1);
});
