// ~ — the hero banner: a shell session that introduces the profile.
//
// The card is a transcript, not a poster. Four prompts run in order — whoami,
// cat .bio, ls ~/now — and the session is left open on a blinking cursor, so
// the first thing a visitor sees is somebody mid-work rather than a résumé.
//
// Nothing is invented. The handle is data.login, the bio is data.bio rendered
// verbatim (its lowercase "i" is the author's own voice and is left alone),
// the join month comes from data.createdAt and the headline figure is
// data.totals.contributions. Location falls back to the string 'Switzerland'
// only when the API returns null, which it currently does.
//
// Two typographic anchors carry the layout: the handle bottom-left of the
// hero row and the contribution count bottom-right of it, sharing a baseline.
// Three elements — the stat caption, the stat and the join date — right-align
// on a single spine at W - PAD so the wide card has a real right edge instead
// of ragged whitespace.
//
// Colour discipline: amber belongs to the prompt (glyphs + cursor) and to
// nothing else, which makes it the only accent that reads at a glance. Values
// are cyan, prose is dim, the two big runs are plain foreground so they carry
// weight by size instead of by hue.
import { FULL, T } from '../lib/theme.js';
import { doc, panel, rule, trafficLights, text, fmt, ch, chw, clamp } from '../lib/svg.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---- geometry -------------------------------------------------------- */
const W = FULL;              // 880
const H = 324;
const PAD = 20;              // body horizontal padding
const BAR = 34;              // title bar height

const MONO = T.body;         // 13 — every shell line sits on this advance
const CW = ch(MONO);         // 7.8px per column
const HERO = T.h1;           // 34 — handle and headline stat
const CAP = T.tiny;          // 11 — the stat caption

const px = (n) => Math.round(n * 10) / 10;
const col = (n) => px(PAD + n * CW);

const X0 = col(0);           // column 0: prompts and command output
const X_CMD = col(2);        // column 2: the typed command, after "❯ "
const RIGHT = W - PAD;       // 860 — the right alignment spine

const Y_CMD1 = 70;           // ❯ whoami          (stat caption shares it)
const Y_HERO = 116;          // salexandr0s       (headline stat shares it)
const Y_CMD2 = 164;          // ❯ cat .bio
const Y_BIO = 187;           // first bio line
const BIO_LEAD = 19;         // bio line height
const Y_CMD3 = 238;          // ❯ ls ~/now
const Y_NOW = 260;           // its output
const Y_CMD4 = 294;          // ❯ ▉ — the open prompt

const BIO_COLS = 56;         // wraps this bio into two whole sentences
const CUR_W = px(CW);        // block cursor = exactly one character cell
const CUR_UP = 10.5;
const CUR_H = 14;

// The prompt marker is drawn, not typed. U+276F is not in the embedded
// JetBrains Mono subset - nor in JetBrains Mono at all - so a text run falls
// back to whatever the viewer's OS happens to ship: an unpredictable advance
// on macOS and Windows, tofu on a bare Linux box. A two-segment stroke is
// pixel-exact, stays inside its own character cell, and being a graphic
// rather than text it answers to the 3:1 non-text contrast bar, which the
// light-theme amber clears (4.21:1) where the 4.5:1 text bar it did not.
const CHEV_W = 4.6;          // apex reach inside the cell
const CHEV_H = 8.4;          // full vertical span
const CHEV_MID = 4.4;        // optical centre above the baseline
const CHEV_STROKE = 1.9;     // reads as the 700 weight the glyph carried

/* ---- motion ---------------------------------------------------------- */
// The whole sequence is deliberately short. Until it finishes, the card is
// genuinely blank, and this is the hero image on the profile — a three-second
// boot sequence reads as a broken image to anyone who lands and scrolls. The
// base CSS still declares the finished state, so any renderer that ignores CSS
// animation altogether draws the completed card rather than an empty one.
const TYPE = 0.032;          // seconds per typed character
const CUE = [                // command, moment it starts typing
  { s: 'whoami', at: 0.10 },
  { s: 'cat .bio', at: 0.52 },
  { s: 'ls ~/now', at: 1.02 },
];
const T_OUT = [0.32, 0.80, 1.30];   // each command's output lands here
const T_PROMPT = [0.04, 0.46, 0.96, 1.40];
const T_STAT = 1.34;         // the headline number is the last beat
const T_CURSOR = 1.46;
const T_BLINK = 1.58;

/* ---- helpers --------------------------------------------------------- */
const monthYear = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = MONTHS[d.getUTCMonth()];
  return m ? `${m} ${d.getUTCFullYear()}` : '';
};

/** The shell prompt marker, on the character grid and independent of any font. */
const chevron = (x, y, t) => {
  const cx = px(x + (CW - CHEV_W) / 2);
  const cy = px(y - CHEV_MID);
  return `<path d="M${cx} ${px(cy - CHEV_H / 2)}L${px(cx + CHEV_W)} ${cy}L${cx} ${px(cy + CHEV_H / 2)}" ` +
    `fill="none" stroke="${t.amber}" stroke-width="${CHEV_STROKE}" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`;
};

/** Greedy word wrap to a hard column count, hard-clamped so nothing overruns. */
const wrap = (s, cols, max) => {
  const words = String(s).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= cols) line += ` ${w}`;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    const tail = lines.slice(max - 1).join(' ');
    lines.length = max - 1;
    lines.push(tail);
  }
  return lines.map((l) => clamp(l, cols));
};

export default function card(data, t) {
  const login = String(data?.login || 'salexandr0s');
  const place = String(data?.location || 'Switzerland');
  const site = 'savorg.xyz';
  const bio = typeof data?.bio === 'string' ? data.bio.trim() : '';
  const bioLines = bio ? wrap(bio, BIO_COLS, 2) : [];

  const raw = Number(data?.totals?.contributions);
  const hasTotal = Number.isFinite(raw);
  const totalStr = hasTotal ? fmt(raw) : '';
  const capStr = 'contributions in the last year';

  const joined = monthYear(data?.createdAt);
  const sinceStr = joined ? `member since ${joined}` : '';

  /* ---- animation registry: ids are minted as markup is built ---------- */
  const defs = [];
  const css = [];
  let nType = 0;
  let nFade = 0;

  // A command types in behind a clip rect that scales from its own left edge.
  // The run is translated into place so the rect can sit at local x=0, which
  // makes the scale origin correct under either transform-box resolution.
  const typed = (x, y, s, fill) => {
    const id = `ty${++nType}`;
    defs.push(
      `<clipPath id="${id}"><rect class="ty ${id}" x="0" y="${px(y - MONO * 0.9)}" ` +
      `width="${px(chw(s, MONO))}" height="${px(MONO * 1.3)}"/></clipPath>`,
    );
    css.push(`.${id}{animation:ty ${(s.length * TYPE).toFixed(2)}s steps(${s.length}) ${CUE[nType - 1].at.toFixed(2)}s both}`);
    return `<g transform="translate(${px(x)} 0)" clip-path="url(#${id})">` +
      text({ x: 0, y, s, size: MONO, fill }) + `</g>`;
  };

  // Output does not type — it appears, the way a process writes a line.
  const fade = (markup, at, name = 'rv', dur = 0.26) => {
    const id = `fd${++nFade}`;
    css.push(`.${id}{animation:${name} ${dur}s ease-out ${at.toFixed(2)}s both}`);
    return `<g class="rv ${id}">${markup}</g>`;
  };

  /* ---- prompt column --------------------------------------------------- */
  const prompts = [Y_CMD1, Y_CMD2, Y_CMD3, Y_CMD4]
    .map((y, i) => fade(chevron(X0, y, t), T_PROMPT[i], 'rv', 0.18))
    .join('');

  /* ---- commands -------------------------------------------------------- */
  const commands = [Y_CMD1, Y_CMD2, Y_CMD3]
    .map((y, i) => typed(X_CMD, y, CUE[i].s, t.fg))
    .join('');

  /* ---- ❯ whoami -> the handle, and the headline readout ---------------- */
  const handle = fade(
    text({ x: X0, y: Y_HERO, s: login, size: HERO, weight: 700, fill: t.fg }),
    T_OUT[0], 'rv', 0.32,
  );

  const stat = hasTotal
    ? fade(
      text({ x: RIGHT, y: Y_CMD1, s: capStr, size: CAP, fill: t.fgDim, anchor: 'end' }) +
      text({ x: RIGHT, y: Y_HERO, s: totalStr, size: HERO, weight: 700, fill: t.fg, anchor: 'end' }),
      T_STAT, 'lift', 0.42,
    )
    : '';

  /* ---- ❯ cat .bio ------------------------------------------------------ */
  const bioRun = bioLines
    .map((line, i) => fade(
      text({ x: X0, y: Y_BIO + i * BIO_LEAD, s: line, size: MONO, fill: t.fgDim }),
      T_OUT[1] + i * 0.12,
    ))
    .join('');

  /* ---- ❯ ls ~/now ------------------------------------------------------ */
  // The separator is drawn, not typed: a circle is pixel-exact and needs no
  // glyph, so the run stays on the character grid whatever the font resolves.
  const sepCols = 3;
  const sep = (x) =>
    `<circle cx="${px(x + CW * 1.5)}" cy="${px(Y_NOW - MONO * 0.31)}" r="1.6" fill="${t.fgMuted}"/>`;

  let nx = X0;
  let nowRun = text({ x: nx, y: Y_NOW, s: place, size: MONO, fill: t.cyan });
  nx = px(nx + chw(place, MONO));
  nowRun += sep(nx);
  nx = px(nx + CW * sepCols);
  nowRun += text({ x: nx, y: Y_NOW, s: site, size: MONO, fill: t.cyan });
  if (sinceStr) {
    nowRun += text({ x: RIGHT, y: Y_NOW, s: sinceStr, size: MONO, fill: t.fgDim, anchor: 'end' });
  }
  const now = fade(nowRun, T_OUT[2], 'rv', 0.3);

  /* ---- the open prompt ------------------------------------------------- */
  const cursor =
    `<rect class="cur" x="${X_CMD}" y="${px(Y_CMD4 - CUR_UP)}" width="${CUR_W}" height="${CUR_H}" fill="${t.amber}"/>`;

  /* ---- chrome + assembly ----------------------------------------------- */
  const body =
    panel({ w: W, h: H, t, r: 10 }) +
    trafficLights({ x: 19, y: 17, t, r: 4, gap: 15 }) +
    text({ x: W / 2, y: 21, s: `${login}@github: ~`, size: 11, weight: 400, fill: t.fgDim, anchor: 'middle' }) +
    rule({ x: 0, y: BAR, w: W, t }) +
    prompts + commands + handle + stat + bioRun + now + cursor;

  const spoken = [
    `Terminal window titled ${login} at github, home directory.`,
    `The command whoami prints ${login}.`,
    bio ? `The command cat .bio prints: ${bio}` : '',
    `The command ls ~/now lists ${place}, the site ${site}${sinceStr ? `, and ${sinceStr}` : ''}.`,
    hasTotal ? `A readout in the top right reads ${totalStr} ${capStr}.` : '',
    'The session is left open on a blinking cursor.',
  ].filter(Boolean).join(' ');

  return doc({
    w: W, h: H, t, body,
    defs: defs.join(''),
    css: `
.ty{transform-box:fill-box;transform-origin:left center;transform:scaleX(1);}
@keyframes ty{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes rv{from{opacity:0}to{opacity:1}}
@keyframes lift{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,55%{opacity:1}55.01%,100%{opacity:0}}
.cur{animation:rv .22s ease-out ${T_CURSOR}s both,blink 1.06s linear ${T_BLINK}s infinite;}
${css.join('\n')}
@media (prefers-reduced-motion:reduce){.ty,.rv,.cur{animation-name:none;}}`,
    title: spoken,
  });
}
