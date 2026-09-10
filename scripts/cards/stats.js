// ~/stats — the totals panel.
//
// The point of this card: a stats widget that can only see public events reports
// 561 commits. With a token that can read restricted contribution counts the same
// year is 1,847. So the headline is the full number and the split underneath it —
// bar plus tree — names exactly which part of it is invisible to everyone else.
//
// Every number rendered here comes straight out of data.totals / data.streak.
// The only derived quantity is the *width* of the two bar segments, which is a
// visual encoding of the 561 : 1,210 ratio, never printed as a figure.
import { HALF, T } from '../lib/theme.js';
import { doc, panel, rule, trafficLights, text, fmt, ch, chw } from '../lib/svg.js';

// ---------------------------------------------------------------- geometry ---
const W = HALF;            // 434
const H = 230;
const PAD = 20;            // body horizontal padding
const RIGHT = W - PAD;     // 414 — the single right rail every value locks to
const BODY = W - PAD * 2;  // 394

const BAR_Y = 78;
const BAR_H = 8;
const BAR_R = BAR_H / 2;
const BAR_GAP = 3;         // seam between the two segments
const BAR_MID = BAR_Y + BAR_H / 2;

// JetBrains Mono draws its box-drawing glyphs across a full 1.32em cell, so the
// two tree rows are stepped by exactly that — the ├ and └ stems then meet with
// no seam. Any other step leaves a visible gap in the stem.
const CELL = 1.32;
const TREE_STEP = T.small * CELL;   // 15.84

const Y = {
  head: 66,   // headline baseline (26px)
  pub: 104,   // ├─ public commits
  priv: 104 + TREE_STEP,  // └─ private, stem-continuous with the line above
  rule: 135,
  r1: 153,    // merged PRs
  r2: 171,    // repositories
  r3: 189,    // stars earned
  streak: 210,
};

const TREE_X = PAD + 14;   // box-drawing lines indent under the headline
const GUTTER = 10;         // breathing room either side of a dot leader

// ------------------------------------------------------------------ helpers ---
/** 2dp is plenty for user units and keeps the markup free of float noise. */
const n = (v) => Math.round(v * 100) / 100;

/** null for anything that is not a real number, so nothing is ever invented. */
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** Display form of a datum: grouped digits, or an em dash when absent. */
const show = (v) => (num(v) === null ? '—' : fmt(num(v)));

/** Bar maths only — a missing count contributes no width. */
const wide = (v) => num(v) ?? 0;

/** No "1 days". Nothing at all when the figure itself is missing. */
const days = (v) => (num(v) === null ? '' : num(v) === 1 ? 'day' : 'days');

/**
 * Dot leader tying a label to its value. Sized in whole characters so the run
 * is exactly on the monospace grid, then centred in the gap it was given.
 */
function leader({ from, to, y, t, size = T.small }) {
  const cols = Math.floor((to - from) / ch(size));
  if (cols < 3) return '';
  const run = '·'.repeat(cols);
  const x = from + (to - from - chw(run, size)) / 2;
  return text({ x: n(x), y, s: run, size, fill: t.border });
}

/**
 * label ......... value
 * Label in fgDim on the left, optional small note after it, value bold in fg
 * hard against RIGHT. Widths come from chw() so the rail is exact, not eyeballed.
 */
function statRow({ t, y, label, value, note, noteFill, size = T.small }) {
  const out = [text({ x: PAD, y, s: label, size, fill: t.fgDim })];
  let end = PAD + chw(label, size);
  if (note) {
    const nx = end + GUTTER;
    out.push(text({ x: n(nx), y, s: note, size: T.tiny, fill: noteFill || t.fgDim }));
    end = nx + chw(note, T.tiny);
  }
  out.push(text({ x: RIGHT, y, s: value, size, weight: 700, fill: t.fg, anchor: 'end' }));
  out.push(leader({ from: end + GUTTER, to: RIGHT - chw(value, size) - GUTTER, y, t, size }));
  return out.join('');
}

/**
 * ├─ label ...... value, with the glyph carrying the bar segment's colour so the
 * two lines double as the legend for the split bar above them.
 */
function treeRow({ t, y, glyph, tint, label, value, size = T.small }) {
  const lx = TREE_X + chw(glyph + ' ', size);
  return [
    text({ x: TREE_X, y: n(y), s: glyph, size, fill: tint }),
    text({ x: n(lx), y: n(y), s: label, size, fill: t.fgDim }),
    text({ x: RIGHT, y: n(y), s: value, size, weight: 700, fill: t.fg, anchor: 'end' }),
    leader({ from: lx + chw(label, size) + GUTTER, to: RIGHT - chw(value, size) - GUTTER, y: n(y), t, size }),
  ].join('');
}

/**
 * `longest streak 34 days` as three runs — dim label, bold count, dim unit —
 * laid out left to right from a start point derived from the total run width,
 * so the right-hand pair terminates exactly on RIGHT.
 */
function streakGroup({ t, y, label, value, unit, align = 'left', size = T.small }) {
  const parts = [
    { s: label, fill: t.fgDim, weight: 400 },
    { s: value, fill: t.fg, weight: 700 },
    { s: unit, fill: t.fgDim, weight: 400 },
  ].filter((p) => p.s);
  const total = parts.reduce((a, p) => a + chw(p.s, size), 0) + ch(size) * (parts.length - 1);
  let x = align === 'right' ? RIGHT - total : PAD;
  return parts.map((p) => {
    const run = text({ x: n(x), y, s: p.s, size, weight: p.weight, fill: p.fill });
    x += chw(p.s, size) + ch(size);
    return run;
  }).join('');
}

// --------------------------------------------------------------------- card ---
export default function card(data, t) {
  const totals = (data && data.totals) || {};
  const streak = (data && data.streak) || {};

  const contributions = show(totals.contributions);
  const publicCommits = show(totals.publicCommits);
  const privateContribs = show(totals.privateContribs);
  const prsMerged = show(totals.prsMerged);
  const reposOwned = show(totals.reposOwned);
  const reposPublic = num(totals.reposPublic);
  const stars = show(totals.stars);
  const longest = show(streak.longest);
  const current = show(streak.current);

  // Split bar widths: the 561 : 1,210 ratio, drawn not written. A non-zero side
  // never shrinks below one pill's width, so "a little private work" can never
  // render as "none"; the seam only exists when there are two sides to separate.
  const pub = wide(totals.publicCommits);
  const priv = wide(totals.privateContribs);
  const split = pub + priv;
  const gap = pub > 0 && priv > 0 ? BAR_GAP : 0;
  const usable = BODY - gap;
  let pubW = 0;
  let privW = 0;
  if (split > 0) {
    pubW = pub > 0 ? Math.min(usable - (priv > 0 ? BAR_H : 0), Math.max(BAR_H, (usable * pub) / split)) : 0;
    privW = priv > 0 ? usable - pubW : 0;
    pubW = n(pubW);
    privW = n(privW);
  }
  const privX = n(PAD + pubW + gap);

  const seg = (x, w, fill, cls) => (w > 0
    ? `<rect x="${x}" y="${BAR_Y}" width="${w}" height="${BAR_H}" rx="${BAR_R}" fill="${fill}" clip-path="url(#st-${cls})"/>`
    : '');

  const defs = [
    `<clipPath id="st-wa"><rect class="wa" x="${PAD}" y="${BAR_Y}" width="${pubW}" height="${BAR_H}"/></clipPath>`,
    `<clipPath id="st-wb"><rect class="wb" x="${privX}" y="${BAR_Y}" width="${privW}" height="${BAR_H}"/></clipPath>`,
  ].join('');

  const css = `
.wa{transform-origin:${PAD}px ${BAR_MID}px;animation:st-wipe .62s cubic-bezier(.2,.72,.28,1) .10s both;}
.wb{transform-origin:${privX}px ${BAR_MID}px;animation:st-wipe .66s cubic-bezier(.2,.72,.28,1) .26s both;}
@keyframes st-wipe{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@media (prefers-reduced-motion:reduce){
  .wa,.wb{animation-name:none;transform:none;}
}`;

  const headWidth = chw(contributions, T.h2);

  const body = [
    panel({ w: W, h: H, t }),
    trafficLights({ x: 19, y: 17, t, r: 4, gap: 15 }),
    text({ x: W / 2, y: 21, s: '~/stats', size: 11, weight: 400, fill: t.fgDim, anchor: 'middle' }),
    rule({ x: 0, y: 34, w: W, t }),

    // Headline: the number no public-only widget can reach.
    text({ x: PAD, y: Y.head, s: contributions, size: T.h2, weight: 700, fill: t.amber }),
    text({ x: n(PAD + headWidth + GUTTER), y: Y.head, s: 'contributions', size: T.small, fill: t.fgDim }),
    text({ x: RIGHT, y: Y.head, s: 'past year', size: T.tiny, fill: t.fgDim, anchor: 'end' }),

    // The split, drawn.
    `<rect x="${PAD}" y="${BAR_Y}" width="${BODY}" height="${BAR_H}" rx="${BAR_R}" fill="${t.grid}"/>`,
    seg(PAD, pubW, t.green, 'wa'),
    seg(privX, privW, t.amber, 'wb'),

    // The split, named. Glyph tint keys each line to its bar segment.
    treeRow({ t, y: Y.pub, glyph: '├─', tint: t.green, label: 'public commits', value: publicCommits }),
    treeRow({ t, y: Y.priv, glyph: '└─', tint: t.amber, label: 'private', value: privateContribs }),

    rule({ x: PAD, y: Y.rule, w: BODY, t }),

    statRow({ t, y: Y.r1, label: 'merged PRs', value: prsMerged }),
    statRow({
      t, y: Y.r2, label: 'repositories', value: reposOwned,
      note: reposPublic === null ? '' : `${fmt(reposPublic)} public`, noteFill: t.green,
    }),
    statRow({ t, y: Y.r3, label: 'stars earned', value: stars }),

    streakGroup({ t, y: Y.streak, label: 'longest streak', value: longest, unit: days(streak.longest) }),
    streakGroup({ t, y: Y.streak, label: 'current streak', value: current, unit: days(streak.current), align: 'right' }),
  ].join('');

  const title =
    `Stats: ${contributions} contributions in the past year — ${publicCommits} public commits and ` +
    `${privateContribs} private contributions. ${prsMerged} merged pull requests, ${reposOwned} repositories` +
    (reposPublic === null ? '' : ` (${fmt(reposPublic)} public)`) +
    `, ${stars} stars earned. Longest streak ${longest} ${days(streak.longest) || 'days'}, ` +
    `current streak ${current} ${days(streak.current) || 'days'}.`;

  return doc({ w: W, h: H, t, body, defs, css, title });
}
