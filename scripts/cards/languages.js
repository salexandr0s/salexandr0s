// ~/languages — the language-mass panel.
//
// Sits directly beside ~/stats in the README, so it borrows that card's rhythm:
// same title bar, same headline baseline, same bar line, same 18px row step, and
// a closing line that bottoms out level with it. If you change spacing here,
// change it there too.
//
// The measurement is bytes of source across every repository the account owns,
// private included, forks excluded. That is a different — and more honest —
// number than the public-only language split GitHub shows on the profile, which
// is why the basis is stated on the card rather than left implied.
import { HALF, T, LANG_COLOR } from '../lib/theme.js';
import { doc, panel, rule, trafficLights, text, clamp, ch, chw } from '../lib/svg.js';

// ---------------------------------------------------------------- geometry ---
const W = HALF;            // 434
const H = 230;             // must equal stats.js H — they are side by side
const PAD = 20;
const RIGHT = W - PAD;     // 414
const BODY = W - PAD * 2;  // 394

const BAR_Y = 78;          // matches stats.js BAR_Y
const BAR_H = 8;
const BAR_R = BAR_H / 2;

const NAMED = 6;           // legend names the top 6, then pools the rest as "other"
const COL_GAP = 20;
const COL_W = (BODY - COL_GAP) / 2;   // 187

// Seven buckets over two columns fill four rows down the first and three down
// the second. The 18px step is stats.js's stat-row step, and the caption keeps
// its baseline, so the two cards still line up side by side.
const Y = {
  head: 66,
  rows: [104, 122, 140, 158],
  rule: 175,
  tracked: 193,
  caption: 212,
};

const DOT_R = 3.5;
const GUTTER = 10;

// Sequenced reveal: each segment grows from its own left edge, 60ms apart.
const STEP = 0.06;
const GROW = 0.34;         // (buckets-1)*STEP + GROW = 0.70s for a full bar
const FADE = 0.30;
const EASE = 'cubic-bezier(.22,.7,.28,1)';

// ------------------------------------------------------------------ helpers ---
const n = (v) => Math.round(v * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** One decimal, but never "0.0%" for a language that genuinely has bytes. */
const pct = (v) => {
  const x = num(v);
  if (x === null) return '—';
  if (x > 0 && x < 0.1) return '<0.1%';
  return `${x.toFixed(1)}%`;
};

/** Bytes in the largest unit that keeps the figure readable. */
const bytes = (v) => {
  const x = num(v);
  if (x === null) return '—';
  const units = [['GB', 1e9], ['MB', 1e6], ['kB', 1e3]];
  for (const [u, f] of units) if (x >= f) return `${(x / f).toFixed(x / f >= 100 ? 0 : 1)} ${u}`;
  return `${x} B`;
};

const plural = (n_, one, many) => `${n_} ${n_ === 1 ? one : many}`;

// ------------------------------------------------------------------- pieces ---
/** Colour chip, name, and a percentage locked to the column's right rail. */
function legendRow({ t, x, right, y, item, i, cols }) {
  return [
    `<circle class="lgDot" style="animation-name:lgO${i}" cx="${n(x + DOT_R)}" cy="${y - 4}" r="${DOT_R}" fill="${item.color}"/>`,
    text({ x: n(x + DOT_R * 2 + 8), y, s: clamp(item.name, cols), size: T.small, fill: item.pooled ? t.fgDim : t.fg }),
    text({ x: right, y, s: pct(item.pct), size: T.small, fill: t.fgDim, anchor: 'end' }),
  ].join('');
}

/** Label left, value right — same row shape stats.js uses. */
function statRow({ t, y, label, value }) {
  return [
    text({ x: PAD, y, s: label, size: T.small, fill: t.fgDim }),
    text({ x: RIGHT, y, s: value, size: T.small, weight: 700, fill: t.fg, anchor: 'end' }),
  ].join('');
}

// -------------------------------------------------------------------- card ---
export default function card(data, t) {
  // A malformed entry must not take the whole build down with it.
  const all = Array.isArray(data?.languages)
    ? data.languages.filter((l) => l && l.name != null && num(l.pct) !== null)
    : [];
  const totalBytes = all.reduce((a, l) => a + (num(l.size) ?? 0), 0);

  // The byte total deliberately skips archived repositories, and an empty repo
  // contributes nothing, so the count printed beside the total must be the
  // repositories the bytes were actually measured from. `totals.reposOwned`
  // counts every repository owned — using it here would overstate the basis of
  // the measurement the card is making. (stats.js prints reposOwned, which is a
  // different and correct claim there: repositories owned, not measured.)
  const measured = Array.isArray(data?.repos)
    ? data.repos.filter((r) => r && !r.isArchived && r.languages?.edges?.length).length
    : null;
  const repoCount = measured ?? num(data?.totals?.reposOwned);

  const top = all.slice(0, NAMED);
  const rest = all.slice(NAMED);
  const otherPct = rest.reduce((a, l) => a + l.pct, 0);

  // Legend and bar draw the same buckets, so neither can drift from the other.
  //
  // Linguist has no colour for every language. Resolve against the linguist
  // table directly rather than trusting `l.color`: the data layer already
  // substitutes a fixed grey for unmapped languages, and that grey is the LIGHT
  // theme's muted token, so `l.color || t.fgMuted` never fires and an unmapped
  // language (Astro, today) would carry a light-theme swatch onto the dark card.
  const buckets = top.map((l) => ({ ...l, color: LANG_COLOR[l.name] || t.fgMuted }));
  if (rest.length) {
    buckets.push({
      name: `other (${rest.length})`, pct: otherPct, color: t.fgMuted, pooled: true,
      size: rest.reduce((a, l) => a + (num(l.size) ?? 0), 0),
    });
  }

  // --- segmented bar ------------------------------------------------------
  // Boundaries are cumulative and normalised over the buckets actually drawn,
  // so rounding never opens a seam and the last edge lands exactly on RIGHT.
  const share = buckets.reduce((a, b) => a + b.pct, 0) || 1;
  const edges = [PAD];
  let acc = 0;
  for (const b of buckets) {
    acc += b.pct;
    edges.push(n(PAD + BODY * (acc / share)));
  }
  edges[edges.length - 1] = RIGHT;

  const segs = buckets.map((b, i) => ({ ...b, x: edges[i], w: Math.max(0, n(edges[i + 1] - edges[i])) }));

  const segRects = segs.map((s, i) =>
    `<rect class="lgSeg" style="animation-name:lgS${i}" x="${s.x}" y="${BAR_Y}" ` +
    `width="${s.w}" height="${BAR_H}" fill="${s.color}"/>`).join('');

  // Hairlines between neighbours keep similar hues apart in both themes; each
  // arrives with the segment it introduces.
  const seams = segs.slice(1).map((s, i) =>
    `<rect class="lgSeam" style="animation-name:lgO${i + 1}" x="${s.x}" y="${BAR_Y}" ` +
    `width="1" height="${BAR_H}" fill="${t.panel}"/>`).join('');

  const defs = `<clipPath id="lgBar"><rect x="${PAD}" y="${BAR_Y}" width="${BODY}" height="${BAR_H}" rx="${BAR_R}"/></clipPath>`;

  // Each segment grows from its own left edge over the t.grid track, so the bar
  // fills left to right rather than every colour appearing at once.
  //
  // The stagger lives inside each element's own keyframes rather than in
  // animation-delay, so nothing relies on `backwards` fill to stay hidden until
  // its turn. That matters: the element's *static* style is then the finished
  // state, so any renderer that ignores CSS animation — most SVG rasterisers,
  // and anything that samples the image at t=0 — still shows the complete card.
  const dur = n((buckets.length - 1) * STEP + GROW);
  const at = (sec) => `${n((sec / dur) * 100)}%`;
  const hold = (i, s, decl) => (i ? `0%,${at(s)}{${decl}}` : `0%{${decl}}`);
  // The last bucket lands exactly on the end of the timeline, so guard against
  // emitting the degenerate selector list "100%,100%".
  const settle = (sec) => { const p = at(Math.min(sec, dur)); return p === '100%' ? p : `${p},100%`; };
  const keyframes = buckets.map((_, i) => {
    const s = i * STEP;
    return `@keyframes lgS${i}{${hold(i, s, `transform:scaleX(0);animation-timing-function:${EASE};`)}` +
      `${settle(s + GROW)}{transform:scaleX(1);}}` +
      `@keyframes lgO${i}{${hold(i, s, 'opacity:0;')}` +
      `${settle(s + FADE)}{opacity:1;}}`;
  }).join('\n');

  const css = `
.lgSeg,.lgSeam,.lgDot{animation-duration:${dur}s;animation-timing-function:linear;animation-fill-mode:forwards;animation-iteration-count:1;}
.lgSeg{transform-box:fill-box;transform-origin:left center;}
${keyframes}
@media (prefers-reduced-motion:reduce){
.lgSeg,.lgSeam,.lgDot{animation:none;transform:none;opacity:1;}
}`;

  const lead = all[0];
  const headPct = lead ? pct(lead.pct) : '—';
  const headW = chw(headPct, T.h2);

  // The pct rail is sized to the widest value actually rendered, and the name
  // column takes exactly what is left — in whole characters, so nothing can
  // creep into the rail.
  const pctW = buckets.reduce((m, b) => Math.max(m, chw(pct(b.pct), T.small)), 0);
  const nameCols = Math.max(4, Math.floor((COL_W - (DOT_R * 2 + 8) - GUTTER - pctW) / ch(T.small)));

  const body = [
    panel({ w: W, h: H, t }),
    trafficLights({ x: 19, y: 17, t, r: 4, gap: 15 }),
    text({ x: W / 2, y: 21, s: '~/languages', size: 11, weight: 400, fill: t.fgDim, anchor: 'middle' }),
    rule({ x: 0, y: 34, w: W, t }),

    // Headline: the dominant share, then what holds it.
    text({ x: PAD, y: Y.head, s: headPct, size: T.h2, weight: 700, fill: t.amber }),
    text({ x: n(PAD + headW + GUTTER), y: Y.head, s: lead ? lead.name : 'no data', size: T.small, fill: t.fgDim }),
    text({ x: RIGHT, y: Y.head, s: plural(all.length, 'language', 'languages'), size: T.tiny, fill: t.fgDim, anchor: 'end' }),

    `<rect x="${PAD}" y="${BAR_Y}" width="${BODY}" height="${BAR_H}" rx="${BAR_R}" fill="${t.grid}"/>`,
    `<g clip-path="url(#lgBar)">${segRects}${seams}</g>`,

    // Legend: two columns, filled down each column in turn. The column depth is
    // derived from the bucket count so a short list splits evenly instead of
    // stacking up in column one.
    ...buckets.map((b, i) => {
      const depth = Math.min(Y.rows.length, Math.ceil(buckets.length / 2));
      const colIdx = Math.floor(i / depth);
      const rowIdx = i % depth;
      const x = PAD + colIdx * (COL_W + COL_GAP);
      return legendRow({ t, x: n(x), right: n(x + COL_W), y: Y.rows[rowIdx], item: b, i, cols: nameCols });
    }),

    rule({ x: PAD, y: Y.rule, w: BODY, t }),
    statRow({ t, y: Y.tracked, label: 'source tracked', value: bytes(totalBytes) }),

    // The basis, spelled out. Kept short enough to stay inside the body rails.
    text({
      x: PAD, y: Y.caption, size: T.micro, fill: t.fgDim,
      s: [
        'by bytes',
        repoCount === null ? null : `${repoCount} repos`,
        'public + private, forks excluded',
      ].filter(Boolean).join('  ·  '),
    }),
  ].join('');

  const title = lead
    ? `Languages by bytes across ${repoCount ?? 'all'} repositories, public and private: ` +
      buckets.map((b) => `${b.name} ${pct(b.pct)}`).join(', ') + `. ${bytes(totalBytes)} of source in total.`
    : 'Language breakdown unavailable.';

  return doc({ w: W, h: H, t, body, defs, css, title });
}
