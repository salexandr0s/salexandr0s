// Design tokens for the salexandr0s profile cards.
// Terminal / agent-ops: One Dark family + amber prompt accent.
// Every card compiles against these. Do not hardcode colours in cards.

export const DARK = {
  id: 'dark',
  bg: '#0b0f16',
  panel: '#0e131c',
  raised: '#131a25',
  border: '#1f2937',
  grid: '#161d29',
  fg: '#c9d4e3',
  fgDim: '#7d8ba1',
  fgMuted: '#616e85',   // 3.6:1 on panel — the pooled 'other' bar segment must stay visible
  amber: '#e5a33c',
  cyan: '#56c8d8',
  green: '#8fc866',
  magenta: '#b98ce0',
  red: '#e06a72',
  blue: '#61a5fa',
  // contribution heat ramp, low -> high
  heat: ['#161d29', '#1f4d3a', '#2d7a4f', '#4aa863', '#8fc866'],
  shadow: 'rgba(0,0,0,0.45)',
};

export const LIGHT = {
  id: 'light',
  bg: '#ffffff',
  panel: '#f8f9fb',
  raised: '#f1f3f7',
  border: '#d6dce6',
  grid: '#e6eaf0',
  fg: '#1f2733',
  fgDim: '#5b6675',
  fgMuted: '#798494',   // 3.6:1 on panel — matches the dark theme's separation
  amber: '#9d6210',    // 4.76:1 on panel — clears AA for the 12px tree glyph
  cyan: '#0e7c8c',
  green: '#3f7c22',
  magenta: '#7c4bb5',
  red: '#c0392b',
  blue: '#1f6feb',
  heat: ['#e6eaf0', '#c6e6c8', '#8fd092', '#54ab5c', '#2f7d36'],
  shadow: 'rgba(31,39,51,0.10)',
};

export const THEMES = [DARK, LIGHT];

// Layout grid. Measured on a live profile page, not guessed: GitHub's profile
// README column is a hard 846px and does NOT grow — it reads 846 at 1280, 1512,
// 1920 and 2560 viewport widths alike. Two HALF cards sit side by side only if
// 2 x HALF <= 846, so HALF is 418 and FULL is exactly 2 x HALF, which also makes
// the full-bleed cards align flush with the two-up pair above and below them.
export const FULL = 836;   // full-bleed cards (header, heatmap)
export const HALF = 418;   // two-up cards, side by side in one paragraph

export const U = 4;        // base spacing unit

// JetBrains Mono advance width is 600/1000 em.
export const ADVANCE = 0.6;
export const ch = (size) => size * ADVANCE;
export const chw = (str, size) => str.length * ch(size);

// Type scale
export const T = {
  micro: 10,
  tiny: 11,
  small: 12,
  body: 13,
  base: 14,
  lead: 16,
  h3: 20,
  h2: 26,
  h1: 34,
};

// Language colours (GitHub linguist), only the ones this profile actually uses.
export const LANG_COLOR = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Swift: '#F05138',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#663399',
  Solidity: '#AA6746',
  Go: '#00ADD8',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  MDX: '#fcb32c',
  PLpgSQL: '#336790',
  C: '#555555',
  Ruby: '#701516',
  GLSL: '#5686a5',
  Just: '#384d54',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Nix: '#7e7eff',
  Vim_Script: '#199f4b',
  Mako: '#7e858d',
};
export const langColor = (n) => LANG_COLOR[n] || '#8a94a3';
