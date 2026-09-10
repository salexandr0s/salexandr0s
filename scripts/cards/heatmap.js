// ~/activity — the contribution calendar.
//
// A GitHub-style 7-row calendar redrawn in the terminal idiom: one column per
// week, oldest week on the left. Nothing here is invented — every cell is a day
// from data.days, the footer total is data.totals.contributions, and the five
// heat stops are the theme's ramp. The thresholds that map a day's count onto
// that ramp are quartiles of this profile's own non-zero days, so the card
// stays legible whether a busy day means 3 commits or 30.
import { FULL, T } from '../lib/theme.js';
import { doc, panel, rule, trafficLights, text, fmt, chw } from '../lib/svg.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---- geometry -------------------------------------------------------- */
const W = FULL;              // 880
const H = 200;
const PAD = 20;              // body horizontal padding
const BAR = 34;              // title bar height

const GAP = 3;               // gutter between cells
const CELL_MAX = 12;         // cap; shrinks automatically if the year is wider
const LABEL_W = 18;          // chw('Mon', T.micro) — the day-label gutter
const LABEL_GAP = 8;         // day label -> first column

const MONTH_Y = 51;          // month label baseline
const GRID_Y = 58;           // top edge of row 0 (Sunday)
const FOOT_Y = 183;          // footer baseline (total + legend share it)

const SW = 10;               // legend swatch
const SW_GAP = 3;
const LEG_GAP = 6;           // "less" -> swatches -> "more"

const DUR = 360;             // per-cell entrance
const SWEEP = 1600;          // whole-year sweep, first delay to last cell settled

const px = (n) => Math.round(n * 10) / 10;   // keep coordinates free of float noise
const monthIndex = (iso) => Number(String(iso).slice(5, 7)) - 1;
const yearOf = (iso) => String(iso).slice(0, 4);

export default function card(data, t) {
  const days = Array.isArray(data?.days) ? data.days : [];
  const cols = Math.max(1, Math.ceil(days.length / 7));

  /* ---- fit the year: shrink the cell before ever clipping a week ------ */
  const gutter = LABEL_W + LABEL_GAP;
  const avail = W - PAD * 2 - gutter;
  const cell = Math.max(4, Math.min(CELL_MAX, Math.floor((avail + GAP) / cols) - GAP));
  const step = cell + GAP;
  const gridW = cols * step - GAP;

  // Centre the whole block (day gutter + grid) inside the padded body, then
  // hang the footer off the same two vertical lines so the card has exactly
  // two left/right edges instead of four.
  const blockX = PAD + Math.round((W - PAD * 2 - gutter - gridW) / 2);
  const gridX = blockX + gutter;
  const gridR = gridX + gridW;

  /* ---- data-derived heat thresholds ---------------------------------- */
  const counts = days.map((d) => Number(d?.count) || 0);
  const nz = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const quartile = (p) => (nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 0);
  const q1 = quartile(0.25);
  const q2 = quartile(0.5);
  const q3 = quartile(0.75);
  const level = (c) => (c <= 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);

  /* ---- cells --------------------------------------------------------- */
  // Delay keys on (col + row): a real diagonal wipe for the price of
  // cols+6 keyframe delays instead of one rule per day.
  const cells = days.map((d, i) => {
    const col = Math.floor(i / 7);
    const row = i % 7;
    const x = gridX + col * step;
    const y = GRID_Y + row * step;
    return `<rect class="hc k${col + row}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${t.heat[level(counts[i])]}"/>`;
  }).join('');

  const dmax = cols - 1 + 6;
  const tick = dmax > 0 ? (SWEEP - DUR) / dmax : 0;
  let delays = '';
  for (let k = 0; k <= dmax; k++) delays += `.k${k}{animation-delay:${Math.round(k * tick)}ms}`;

  /* ---- month labels: first full week of each month -------------------- */
  const months = [];
  let prevMonth = -1;
  let lastX = -Infinity;
  for (let c = 0; c < cols; c++) {
    const day = days[c * 7];
    if (!day?.date) break;
    const m = monthIndex(day.date);
    if (m === prevMonth) continue;
    prevMonth = m;
    const label = MONTHS[m];
    if (!label) continue;
    const x = gridX + c * step;
    const lw = chw(label, T.micro);
    if (x - lastX < lw + 10) continue;   // too tight against the previous label
    if (x + lw > gridR) continue;        // would hang off the last week
    lastX = x;
    months.push(text({ x, y: MONTH_Y, s: label, size: T.micro, fill: t.fgDim }));
  }

  /* ---- day-of-week gutter, right-aligned to the grid ------------------ */
  const dayLabels = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']].map(([row, s]) => text({
    x: gridX - LABEL_GAP,
    y: px(GRID_Y + row * step + cell / 2 + 3.4),   // optical centre of a T.micro run
    s, size: T.micro, fill: t.fgDim, anchor: 'end',
  })).join('');

  /* ---- footer: total left, legend right ------------------------------- */
  const total = Number(data?.totals?.contributions) || 0;
  const totalStr = fmt(total);
  const totalRun =
    text({ x: blockX, y: FOOT_Y, s: totalStr, size: T.small, weight: 700, fill: t.amber }) +
    text({ x: px(blockX + chw(`${totalStr} `, T.small)), y: FOOT_Y, s: 'contributions', size: T.small, fill: t.fgDim });

  const swatchesW = t.heat.length * SW + (t.heat.length - 1) * SW_GAP;
  const lessW = chw('less', T.micro);
  const moreW = chw('more', T.micro);
  const legX = px(gridR - (lessW + LEG_GAP + swatchesW + LEG_GAP + moreW));
  const swatchX = legX + lessW + LEG_GAP;
  const legend =
    text({ x: legX, y: FOOT_Y, s: 'less', size: T.micro, fill: t.fgDim }) +
    t.heat.map((c, i) =>
      `<rect x="${swatchX + i * (SW + SW_GAP)}" y="${FOOT_Y - 8.5}" width="${SW}" height="${SW}" rx="2" fill="${c}"/>`).join('') +
    text({ x: gridR, y: FOOT_Y, s: 'more', size: T.micro, fill: t.fgDim, anchor: 'end' });

  /* ---- chrome + assembly ---------------------------------------------- */
  const body =
    panel({ w: W, h: H, t, r: 10 }) +
    trafficLights({ x: 19, y: 17, t, r: 4, gap: 15 }) +
    text({ x: W / 2, y: 21, s: '~/activity — last 12 months', size: 11, weight: 400, fill: t.fgDim, anchor: 'middle' }) +
    rule({ x: 0, y: BAR, w: W, t }) +
    months.join('') +
    dayLabels +
    cells +
    totalRun +
    legend;

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const range = first && last
    ? `${MONTHS[monthIndex(first)]} ${yearOf(first)} to ${MONTHS[monthIndex(last)]} ${yearOf(last)}`
    : 'the last twelve months';

  return doc({
    w: W, h: H, t, body,
    css: `
.hc{transform-box:fill-box;transform-origin:50% 50%;animation:hcin ${DUR}ms cubic-bezier(.2,.7,.3,1) both;}
@keyframes hcin{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:scale(1)}}
${delays}
@media (prefers-reduced-motion:reduce){.hc{animation-name:none;}}`,
    title: `Contribution calendar for the last 12 months: ${totalStr} contributions from ${range}, `
      + `drawn as a grid of ${cols} weekly columns by 7 weekday rows where a stronger colour means more contributions on that day.`,
  });
}
