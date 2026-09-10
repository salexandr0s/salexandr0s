// Shared SVG primitives. Cards build from these so spacing, borders and
// text metrics stay identical across the set.
import { fontFaceCSS, STACK } from './font.js';
import { ch, chw, U } from './theme.js';

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export { ch, chw };

/** Truncate to a hard column count, with an ellipsis when it overflows. */
export const clamp = (s, cols) => {
  s = String(s);
  return s.length <= cols ? s : s.slice(0, Math.max(0, cols - 1)).trimEnd() + '…';
};

export const fmt = (n) => Number(n).toLocaleString('en-US');

/**
 * A text run. `anchor` is start|middle|end. Coordinates are the text
 * baseline, so callers position by baseline, never by box.
 */
export const text = ({ x, y, s, size = 13, weight = 400, fill, anchor = 'start', opacity, cls, extra = '' }) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  (anchor !== 'start' ? ` text-anchor="${anchor}"` : '') +
  (opacity != null ? ` opacity="${opacity}"` : '') +
  (cls ? ` class="${cls}"` : '') +
  `${extra}>${esc(s)}</text>`;

/** Card shell: background, hairline border, optional inner highlight. */
export const panel = ({ w, h, t, r = 10, x = 0, y = 0, fill }) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" ` +
  `fill="${fill || t.panel}" stroke="${t.border}" stroke-width="1"/>`;

/** Horizontal hairline. */
export const rule = ({ x, y, w, t, color, opacity = 1 }) =>
  `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color || t.border}" opacity="${opacity}"/>`;

/** macOS-style window dots — sells the "this is a terminal" read instantly. */
export const trafficLights = ({ x, y, t, r = 4, gap = 16 }) => {
  const cols = [t.red, t.amber, t.green];
  return cols.map((c, i) =>
    `<circle cx="${x + i * gap}" cy="${y}" r="${r}" fill="${c}" opacity="0.75"/>`).join('');
};

/**
 * Shell prompt marker, DRAWN rather than typed.
 * U+276F is not in JetBrains Mono at all, so setting it as text silently falls
 * back to whatever the viewer's OS happens to ship — and renders as tofu on a
 * machine with no Dingbats-capable font. A stroked path is font-independent and
 * sits exactly on the character grid.
 */
export const prompt = ({ x, y, t, size = 13, color }) => {
  const w = size * 0.354, h = size * 0.646, mid = size * 0.338;
  const cx = x + (ch(size) - w) / 2, cy = y - mid;
  const r2 = (v) => Math.round(v * 100) / 100;
  return `<path d="M${r2(cx)} ${r2(cy - h / 2)}L${r2(cx + w)} ${r2(cy)}L${r2(cx)} ${r2(cy + h / 2)}" ` +
    `fill="none" stroke="${color || t.amber}" stroke-width="${r2(size * 0.146)}" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`;
};

/**
 * Wrap card body markup in a complete SVG document.
 * `css` is appended after the font-face + base rules.
 */
export const doc = ({ w, h, t, body, defs = '', css = '', title = '' }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${defs}</defs>
<style>
${fontFaceCSS()}
text{font-family:${STACK};dominant-baseline:auto;white-space:pre;}
${css}
</style>
<rect width="${w}" height="${h}" fill="none"/>
${body}
</svg>`;

export { U };
