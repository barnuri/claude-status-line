#!/usr/bin/env bun
import { StatusParser } from './statusParser.ts';
import { StatusRenderer } from './statusRenderer.ts';
import { SetupWizard } from './setupWizard.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isSetup = args.includes('--setup');

  if (isSetup) {
    const wizard = new SetupWizard();
    await wizard.run();
    return;
  }

  const isTTY = process.stdin.isTTY;
  if (isTTY) {
    const wizard = new SetupWizard();
    await wizard.run();
    return;
  }

  const raw = await readStdin();
  const parser = new StatusParser();
  const status = parser.parse(raw);
  const segments = parser.buildSegments(status);

  const terminalWidth = process.stdout.columns
    ?? (process.env['COLUMNS'] ? parseInt(process.env['COLUMNS'], 10) : 0)
    ?? 0;
  const renderer = new StatusRenderer();
  const output = renderer.render(segments, terminalWidth);

  if (output) {
    process.stdout.write(output + '\n');
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

main().catch(err => {
  if (err instanceof Error) {
    process.stderr.write(`claude-status-line error: ${err.message}\n`);
  }
  process.exit(1);
});
