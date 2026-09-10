#!/usr/bin/env node
// Renders the cards into a local page that mimics GitHub's README column in
// both themes, so the profile can be eyeballed before anything is published.
import { writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const have = new Set(readdirSync(join(root, 'assets')).filter((f) => f.endsWith('.svg')));
// Must be a real http: URL, not a data: URI. Chromium rasterises a data: URI
// SVG once at t=0 and never advances its animation timeline, so entrance
// animations look permanently stuck at their `from` state — the card appears
// blank even though it is correct. Serve this page over the preview server.
const pick = (n, t) => (have.has(`${n}-${t}.svg`) ? `assets/${n}-${t}.svg` : null);

const col = (t) => {
  const img = (n, w) => {
    const p = pick(n, t);
    return p ? `<img src="${p}" width="${w}" alt="${n}">` : `<div class="missing">${n} not built</div>`;
  };
  return `
  <div class="col ${t}">
    <div class="label">${t}</div>
    <div class="readme">
      ${img('header', 880)}
      <div class="row">${img('stats', 434)}${img('languages', 434)}</div>
      ${img('heatmap', 880)}
    </div>
  </div>`;
};

writeFileSync(join(root, 'preview.html'), `<!doctype html><meta charset="utf-8">
<title>profile preview</title>
<style>
  body{margin:0;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:#22272e;color:#adbac7}
  .col{padding:28px 24px}
  .col.dark{background:#0d1117}
  .col.light{background:#ffffff;color:#24292f}
  .label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.45;margin-bottom:14px}
  .readme{max-width:880px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
  .row{display:flex;gap:12px}
  img{display:block;max-width:100%}
  .missing{padding:24px;border:1px dashed currentColor;opacity:.4;text-align:center;border-radius:8px}
</style>
${col('dark')}
${col('light')}
`);
console.log('wrote preview.html');
