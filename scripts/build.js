#!/usr/bin/env node
// Regenerates every card into assets/. Run by .github/workflows/refresh.yml
// on a daily cron; the SVGs are committed so the README never depends on a
// third-party service being up.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './lib/data.js';
import { DARK, LIGHT } from './lib/theme.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS = ['header', 'stats', 'languages', 'heatmap'];

const data = await collect();
mkdirSync(join(root, 'assets'), { recursive: true });

let total = 0;
for (const name of CARDS) {
  const { default: build } = await import(join(root, 'scripts', 'cards', `${name}.js`));
  for (const t of [DARK, LIGHT]) {
    const svg = build(data, t);
    const out = join(root, 'assets', `${name}-${t.id}.svg`);
    writeFileSync(out, svg);
    total += Buffer.byteLength(svg);
    console.log(`  ${name}-${t.id}.svg  ${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB`);
  }
}
console.log(`\n${CARDS.length * 2} cards, ${(total / 1024).toFixed(0)}KB total`);
console.log(`${data.totals.contributions} contributions · ${data.totals.reposOwned} repos · ${data.languages[0].name} ${data.languages[0].pct.toFixed(1)}%`);
