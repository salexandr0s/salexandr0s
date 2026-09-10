// Embeds a subsetted JetBrains Mono as a data: URI so every card renders
// identically everywhere. SVG loaded via <img> cannot fetch external fonts,
// but data: URIs are not external, so this works in Chrome/Firefox/Safari.
// JetBrains Mono is SIL OFL 1.1 — see assets/fonts/OFL.txt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = join(here, '..', '..', 'assets', 'fonts');

const load = (f) => readFileSync(join(fontDir, f), 'utf8').trim();
const REGULAR = load('jbm-regular.b64');
const BOLD = load('jbm-bold.b64');

export const FACE = 'JBM';
export const STACK = `'JBM', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

export const fontFaceCSS = () => `
@font-face{font-family:'JBM';font-style:normal;font-weight:400;font-display:block;
src:url(data:font/woff2;base64,${REGULAR}) format('woff2');}
@font-face{font-family:'JBM';font-style:normal;font-weight:700;font-display:block;
src:url(data:font/woff2;base64,${BOLD}) format('woff2');}`;
