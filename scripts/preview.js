#!/usr/bin/env node
// Render one card (or all) to assets/ and assert it is well-formed, in-bounds
// and free of the failure modes that only show up once GitHub renders it.
//
//   GH_TOKEN=$(gh auth token) node scripts/preview.js [card ...]
//
// Live API data is cached to .cache/data.json for 15 minutes so repeated runs
// stay fast and do not burn rate limit.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './lib/data.js';
import { DARK, LIGHT } from './lib/theme.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(root, '.cache', 'data.json');
const TTL = 15 * 60 * 1000;

export async function getData() {
  if (existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < TTL && !process.env.NO_CACHE) {
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  }
  const d = await collect();
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(d));
  return d;
}

/* ---------- dependency-free XML well-formedness check ---------- */
const VOID = new Set();
function checkXML(src) {
  const errs = [];
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let cursor = 0, m;
  while ((m = tagRe.exec(src))) {
    // any '<' skipped between matches means a malformed tag
    const gap = src.slice(cursor, m.index);
    if (gap.includes('<')) errs.push(`malformed tag near offset ${cursor + gap.indexOf('<')}: ${gap.slice(gap.indexOf('<'), gap.indexOf('<') + 60)}`);
    cursor = tagRe.lastIndex;
    const [, close, name, , selfClose] = m;
    if (close) {
      const top = stack.pop();
      if (top !== name) errs.push(`tag mismatch: </${name}> closes <${top ?? 'nothing'}>`);
    } else if (!selfClose && !VOID.has(name)) {
      stack.push(name);
    }
  }
  if (src.slice(cursor).includes('<')) errs.push('trailing malformed tag');
  if (stack.length) errs.push(`unclosed tags: ${stack.join(' > ')}`);
  return errs;
}

/* ---------- bad-value scan ---------- */
function checkValues(src) {
  const errs = [];
  for (const bad of ['NaN', 'undefined', 'Infinity', '=null', '>null<']) {
    let i = src.indexOf(bad);
    // ignore occurrences inside the base64 font payload
    while (i !== -1) {
      const ctx = src.slice(Math.max(0, i - 90), i + 40);
      if (!ctx.includes('base64,')) { errs.push(`literal "${bad}" in output: …${ctx.slice(-70)}…`); break; }
      i = src.indexOf(bad, i + 1);
    }
  }
  return errs;
}

/* ---------- text overflow (font advance is exactly 0.6em) ---------- */
function checkOverflow(src, w, h) {
  const errs = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(src))) {
    const at = m[1];
    const raw = m[2].replace(/<[^>]*>/g, '');
    const body = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    if (!body.trim()) continue;
    const num = (k, d) => { const v = at.match(new RegExp(`\\b${k}="([-\\d.]+)"`)); return v ? parseFloat(v[1]) : d; };
    const x = num('x', 0), y = num('y', 0), size = num('font-size', 13);
    const anchor = (at.match(/text-anchor="(\w+)"/) || [, 'start'])[1];
    const width = body.length * 0.6 * size;
    let left = x;
    if (anchor === 'middle') left = x - width / 2;
    else if (anchor === 'end') left = x - width;
    const right = left + width;
    if (left < -0.5 || right > w + 0.5) {
      errs.push(`text overflows [0,${w}] -> [${left.toFixed(1)},${right.toFixed(1)}] size=${size} anchor=${anchor}: "${body.slice(0, 52)}"`);
    }
    if (y > h + 0.5 || y < 0) errs.push(`text baseline y=${y} outside [0,${h}]: "${body.slice(0, 40)}"`);
  }
  return errs;
}

/* ---------- animations must end in a visible state ---------- */
function checkAnimations(src) {
  const errs = [];
  const style = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  const anims = [...style.matchAll(/animation\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
  for (const a of anims) {
    if (a.includes('infinite')) continue;
    if (a === 'none') continue;          // reduced-motion reset, not a real animation
    if (!/\b(both|forwards)\b/.test(a)) {
      errs.push(`animation without fill-mode both/forwards (card may end invisible): "${a}"`);
    }
  }
  if (anims.length && !/prefers-reduced-motion/.test(style)) {
    errs.push('animations present but prefers-reduced-motion is not honoured');
  }
  return errs;
}

const ALL = ['header', 'stats', 'languages', 'heatmap'];

async function main() {
  const names = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const cards = names.length ? names : ALL;
  const data = await getData();
  mkdirSync(join(root, 'assets'), { recursive: true });

  let failed = 0;
  for (const name of cards) {
    const mod = await import(join(root, 'scripts', 'cards', `${name}.js`) + `?t=${process.hrtime.bigint()}`);
    const build = mod.default;
    for (const t of [DARK, LIGHT]) {
      let svg;
      try { svg = build(data, t); }
      catch (e) { console.error(`✗ ${name}/${t.id} threw: ${e.message}\n${e.stack?.split('\n')[1] ?? ''}`); failed++; continue; }

      const w = parseFloat((svg.match(/\bwidth="([\d.]+)"/) || [, 0])[1]);
      const h = parseFloat((svg.match(/\bheight="([\d.]+)"/) || [, 0])[1]);
      const errs = [...checkXML(svg), ...checkValues(svg), ...checkOverflow(svg, w, h), ...checkAnimations(svg)];

      const out = join(root, 'assets', `${name}-${t.id}.svg`);
      writeFileSync(out, svg);
      const kb = (Buffer.byteLength(svg) / 1024).toFixed(1);
      if (errs.length) {
        failed++;
        console.error(`✗ ${name}-${t.id}.svg  ${w}x${h}  ${kb}KB  — ${errs.length} problem(s)`);
        for (const e of errs) console.error(`    · ${e}`);
      } else {
        console.log(`✓ ${name}-${t.id}.svg  ${w}x${h}  ${kb}KB`);
      }
    }
  }
  if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
  console.log('\nall checks passed');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
