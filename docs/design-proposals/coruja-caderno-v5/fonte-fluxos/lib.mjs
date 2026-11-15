// Flowchart layout + markup generator for the Moodle IA Design canvas.
// Every element is absolutely placed in one host, as the canvas expects; every
// arrow segment is its own small <svg>. A checker reports overlaps and crossings.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const T = {
  page: "#eef6f1", surface: "#ffffff", surfaceSoft: "#f3f8f4", selected: "#d5e9dc",
  ink: "#173e30", muted: "#345347", line: "#bbd4c6", control: "#789583",
  action: "#26764f", onAction: "#ffffff", error: "#a32638", errorSoft: "#fbe9ec",
  warning: "#8a4b00", warningSoft: "#fff3dc", warningLine: "#9a6a1a", info: "#2b5a86", infoSoft: "#e8f1fb",
  owlSoft: "#f4ebdf", owlInk: "#6b4a2b", moodle: "#f98012", moodleLine: "#c4600a", moodleInk: "#8a4300", moodleSoft: "#fef1e4",
  forum: ["#315683", "#eaf2ff", "#bdd0eb"], assignment: ["#365944", "#e5f4e8", "#bcd7c6"], quiz: ["#7a4a13", "#fcf0d5", "#ddc28d"],
  chat: ["#64437b", "#f1e8f8", "#d9c5e8"], wiki: ["#674b41", "#f6ece7", "#dfc8bc"], glossary: ["#245e62", "#e5f5f4", "#add4d2"],
};
export const SANS = "Switzer, 'Segoe UI', system-ui, sans-serif";

// Lanes of the tall boards (width 1600, margin 64).
export const LANES = {
  E: { x: 64, w: 280 },     // Se der errado
  C: { x: 424, w: 360 },    // Caminho
  O: { x: 864, w: 280 },    // Outras saídas
  N: { x: 1296, w: 240 },   // Pontes
};
export const RAILS = [1184, 1208, 1232, 1256]; // Voltas (loops), between O and N
export const AXIS = LANES.C.x + LANES.C.w / 2;  // 604

let ICON_DIR = null;
let HEIGHTS = {};
export function setHeights(map) { HEIGHTS = map || {}; }
export function setIconDir(dir) { ICON_DIR = dir; }
export function icon(name, size = 20, color = T.action) {
  const raw = readFileSync(join(ICON_DIR, `${name}.svg`), "utf8").replace(/\n/g, "").replace(/\s{2,}/g, "");
  return raw
    .replace('stroke="#173e30"', `stroke="${color}"`)
    .replace('width="24" height="24"', `width="${size}" height="${size}" aria-hidden="true" style="flex-shrink: 0; width: ${size}px; height: ${size}px"`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// ==text== marks a "para ficar de olho" highlight; **text** is bold.
const rich = (s) => esc(s)
  .replace(/==(.+?)==/g, `<span style="background: ${T.warningSoft}; color: ${T.warning}; font-weight: 500; padding: 0 3px; border-radius: 3px">$1</span>`)
  .replace(/\*\*(.+?)\*\*/g, `<b style="font-weight: 500; color: ${T.ink}">$1</b>`);
const plainLen = (s) => String(s).replace(/==|\*\*/g, "").length;

// Rough text metrics for Switzer (generous, so cards never clip).
const charW = (size, weight) => size * (weight >= 600 ? 0.54 : 0.51);
const lines = (text, size, weight, width) => {
  if (!text) return 0;
  const words = String(text).replace(/==|\*\*/g, "").split(/\s+/);
  let n = 1, cur = 0;
  const cw = charW(size, weight), space = cw;
  for (const w of words) {
    const ww = w.length * cw;
    if (cur > 0 && cur + space + ww > width) { n++; cur = ww; } else cur += (cur > 0 ? space : 0) + ww;
  }
  return n;
};
const textW = (text, size, weight) => Math.ceil(plainLen(text) * charW(size, weight));

/* ------------------------------------------------------------ nodes */
export function measure(n) {
  const k = n.kind;
  if (k === "decision") {
    n.w ??= Math.max(240, Math.min(340, Math.round((textW(n.label, 15, 600) + 120) / 2) * 2));
    const ls = lines(n.label, 15, 600, n.w - 128);
    n.h ??= Math.max(120, 64 + ls * 21 + 24);
    return;
  }
  if (k === "end") { n.w ??= 120; n.h ??= 120; return; }
  if (k === "system" || k === "action" || k === "moodleAction") {
    n.w ??= Math.min(n.maxW ?? 360, Math.ceil((textW(n.label, 15, 600) + 92) / 2) * 2);
    n.h ??= 48; return;
  }
  if (k === "interchange") { n.w ??= 240; n.h ??= lines(n.label, 15, 600, n.w - 76) > 1 ? 72 : 52; return; }
  if (k === "plan") return; // sized by caller
  // screen, error, outside, note
  const padX = 18, iconW = 32;
  const inner = n.w - padX * 2 - iconW;
  let h = 16 + 16;
  const titleSize = k === "error" ? 16 : 17;
  h += lines(n.label, titleSize, 600, inner) * 24;
  if (k === "error") {
    for (const row of ["houve", "guardado", "voltar"]) if (n[row]) h += 4 + lines(`${ROWNAME[row]} ${n[row]}`, 14, 400, inner) * 20;
  } else if (n.detail) h += 4 + lines(n.detail, 14, 400, inner) * 20;
  if (n.chips?.length) h += 8 + n.chips.length * 34 - 6;
  n.h ??= Math.ceil((h + 6) / 4) * 4;
}
const ROWNAME = { houve: "O que houve:", guardado: "O que fica guardado:", voltar: "Como voltar:" };

const box = (n, extra) => `position: absolute; left: ${n.x}px; top: ${n.y}px; width: ${n.w}px; height: ${n.h}px; box-sizing: border-box; ${extra}`;

function chipsHtml(chips) {
  if (!chips?.length) return "";
  return `<br><span style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 8px">${chips.map((c) =>
    `<span style="display: inline-block; height: 28px; line-height: 26px; padding: 0 12px; border: 1px solid ${T.control}; border-radius: 14px; font-size: 13px; font-weight: 500; color: ${T.ink}; background: ${T.surface}">${esc(c)}</span>`).join("")}</span>`;
}

export function nodeHtml(n) {
  const k = n.kind;
  return nodeHtmlInner(n).replace("<div style=", `<div data-node="${n.id}" style=`);
}
function nodeHtmlInner(n) {
  const k = n.kind;
  const flexCard = (bg, border, extra = "") => box(n, `padding: 16px 18px; display: flex; align-items: flex-start; gap: 12px; text-align: left; background: ${bg}; border: ${border}; border-radius: 12px; font-family: ${SANS}; ${extra}`);
  if (k === "screen" || k === "outside" || k === "note") {
    const ic = n.icon ?? (k === "outside" ? "hand" : "notebook-pen");
    const style = k === "outside"
      ? flexCard(T.surface, `1px solid ${T.moodleLine}`, `border-top: 4px solid ${T.moodle}; box-shadow: 0 1px 2px rgba(23, 62, 48, 0.06)`)
      : k === "note"
        ? flexCard(T.infoSoft, `1px solid ${T.info}`)
        : flexCard(T.surface, `1px solid ${T.line}`, "box-shadow: 0 1px 2px rgba(23, 62, 48, 0.06), 0 6px 20px rgba(23, 62, 48, 0.06)");
    const icColor = k === "outside" ? T.moodleInk : k === "note" ? T.info : T.action;
    return `<div style="${style}">${icon(ic, 20, icColor)}<span style="font-size: 14px; line-height: 20px; color: ${T.muted}; padding-top: 2px"><b style="font-weight: 600; font-size: 17px; line-height: 24px; color: ${T.ink}">${esc(n.label)}</b>${n.detail ? `<br><span style="display: inline-block; margin-top: 4px">${rich(n.detail)}</span>` : ""}${chipsHtml(n.chips)}</span></div>`;
  }
  if (k === "error") {
    const rows = ["houve", "guardado", "voltar"].filter((r) => n[r]).map((r) => `<span style="display: inline-block; margin-top: 4px"><b style="font-weight: 500; color: ${T.ink}">${ROWNAME[r]}</b> ${rich(n[r])}</span>`).join("<br>");
    return `<div style="${flexCard(T.errorSoft, `1px solid ${T.error}`)}">${icon("triangle-alert", 20, T.error)}<span style="font-size: 14px; line-height: 20px; color: ${T.ink}; padding-top: 2px"><b style="font-weight: 600; font-size: 16px; line-height: 24px; color: ${T.ink}">${esc(n.label)}</b><br>${rows}</span></div>`;
  }
  if (k === "decision") {
    return `<div style="${box(n, `padding: 0 64px; display: flex; align-items: center; justify-content: center; text-align: center; background: ${T.selected}; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); font-family: ${SANS}; font-size: 15px; line-height: 21px; font-weight: 600; color: ${T.ink}`)}">${esc(n.label)}</div>`;
  }
  if (k === "system") {
    return `<div style="${box(n, `padding: 0 18px; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${T.page}; border: 1px dashed ${T.control}; border-radius: 24px; font-family: ${SANS}; font-size: 15px; line-height: 20px; font-weight: 500; color: ${T.muted}`)}">${icon("hourglass", 18, T.muted)}<span>${esc(n.label)}</span></div>`;
  }
  if (k === "action" || k === "moodleAction") {
    const extra = k === "moodleAction" ? `box-shadow: 0 0 0 2px ${T.page}, 0 0 0 3px ${T.moodleLine};` : "";
    return `<div style="${box(n, `padding: 0 20px; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${T.action}; border-radius: 24px; ${extra} font-family: ${SANS}; font-size: 15px; line-height: 20px; font-weight: 500; color: ${T.onAction}`)}">${icon(n.icon ?? (k === "moodleAction" ? "shield-check" : "check"), 18, T.onAction)}<span>${esc(n.label)}</span></div>`;
  }
  if (k === "end") {
    const moodle = n.moodle ? `outline: 1px solid ${T.moodleLine}; outline-offset: 5px;` : "";
    return `<div style="${box(n, `padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-align: center; background: ${T.selected}; border: 1px solid ${T.action}; border-radius: 50%; ${moodle} font-family: ${SANS}; font-size: 15px; line-height: 20px; font-weight: 500; color: ${T.ink}`)}">${icon("check", 28, T.action)}<span>${esc(n.label)}</span></div>`;
  }
  if (k === "interchange") {
    return `<div style="${box(n, `padding: 0 18px; display: flex; align-items: center; gap: 10px; background: ${T.surface}; border: 1px solid ${T.control}; border-radius: ${n.h / 2}px; font-family: ${SANS}; font-size: 15px; line-height: 20px; font-weight: 500; color: ${T.ink}`)}">${icon(n.icon ?? "route", 20, T.ink)}<span>${esc(n.label)}</span></div>`;
  }
  throw new Error(`kind ${k}`);
}

/* ------------------------------------------------------------ anchors + routing */
export function anchor(n, side, at) {
  // at: px from the side's start (top for l/r, left for t/b); default middle.
  if (n.kind === "decision" || n.kind === "end") at = undefined;
  if (side === "t") return { x: n.x + (at ?? n.w / 2), y: n.y, side };
  if (side === "b") return { x: n.x + (at ?? n.w / 2), y: n.y + n.h, side };
  if (side === "l") return { x: n.x, y: n.y + (at ?? n.h / 2), side };
  if (side === "r") return { x: n.x + n.w, y: n.y + (at ?? n.h / 2), side };
  throw new Error(side);
}

// via: list of {x} / {y} lines to travel along, then into the end anchor.
export function route(a, b, via = []) {
  const pts = [{ x: a.x, y: a.y }];
  let cur = { x: a.x, y: a.y };
  for (const v of via) {
    if (v.x !== undefined) cur = { x: v.x, y: cur.y };
    else cur = { x: cur.x, y: v.y };
    pts.push(cur);
  }
  if (b.side === "l" || b.side === "r") { if (cur.y !== b.y) { cur = { x: cur.x, y: b.y }; pts.push(cur); } }
  else if (cur.x !== b.x) { cur = { x: b.x, y: cur.y }; pts.push(cur); }
  pts.push({ x: b.x, y: b.y });
  // drop zero-length and merge collinear
  const out = [pts[0]];
  for (const p of pts.slice(1)) { const q = out[out.length - 1]; if (p.x === q.x && p.y === q.y) continue; out.push(p); }
  for (let i = out.length - 2; i > 0; i--) {
    const a0 = out[i - 1], a1 = out[i], a2 = out[i + 1];
    if ((a0.x === a1.x && a1.x === a2.x) || (a0.y === a1.y && a1.y === a2.y)) out.splice(i, 1);
  }
  // tip stops 1px short of the target edge
  const t = out[out.length - 1], s = out[out.length - 2];
  if (t.x === s.x) t.y += t.y > s.y ? -1 : 1; else t.x += t.x > s.x ? -1 : 1;
  for (let i = 1; i < out.length; i++) if (out[i].x !== out[i - 1].x && out[i].y !== out[i - 1].y) throw new Error(`diagonal segment in route ${JSON.stringify(out)}`);
  return out;
}

export const STYLES = {
  main: { color: T.action, width: 2, dash: null },
  alt: { color: T.muted, width: 1.5, dash: null },
  error: { color: T.error, width: 1.5, dash: "6 4" },
  back: { color: T.error, width: 1.5, dash: null },
  loop: { color: T.muted, width: 1.5, dash: "2 5" },
  moodle: { color: T.moodleLine, width: 1.5, dash: "6 4" },
};

let MARK = 0;
export function resetMarkers() { MARK = 0; }
export function segSvg(p, q, style, head) {
  const st = STYLES[style];
  // Head is 5 stroke widths long; the line stops where the head's back half begins, so the tip lands on the end point.
  const h = head ? 2.5 * st.width : 0;
  const dash = st.dash ? ` stroke-dasharray: ${st.dash};` : "";
  let left, top, w, hh, d;
  if (p.y === q.y) {
    const x = Math.min(p.x, q.x), n = Math.abs(q.x - p.x);
    left = x; top = p.y - 4; w = n; hh = 8;
    d = q.x > p.x ? `M 0 4 L ${n - h} 4` : `M ${n} 4 L ${h} 4`;
  } else {
    const y = Math.min(p.y, q.y), n = Math.abs(q.y - p.y);
    left = p.x - 4; top = y; w = 8; hh = n;
    d = q.y > p.y ? `M 4 0 L 4 ${n - h}` : `M 4 ${n} L 4 ${h}`;
  }
  let defs = "", me = "";
  if (head) {
    MARK++;
    const id = `dc-arrow-head-filled-${MARK}`;
    defs = `<defs><marker id="${id}" orient="auto" markerWidth="6" markerHeight="6" refX="2.5" refY="2.5" overflow="visible"><path d="M0 0 L5 2.5 L0 5 Z" fill="${st.color}" stroke="none" style="stroke: none; fill: ${st.color}; fill: context-stroke"/></marker></defs>`;
    me = ` marker-end="url(#${id})"`;
  }
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none" style="position: absolute; left: ${left}px; top: ${top}px; width: ${w}px; height: ${hh}px; overflow: visible; fill: none; stroke: ${st.color}; stroke-width: ${st.width}; stroke-linecap: round; stroke-linejoin: round;${dash}">${defs}<path d="${d}"${me}></path></svg>`;
}

/* ------------------------------------------------------------ board */
export class Board {
  constructor({ file, title, width, height, ground = T.page }) {
    Object.assign(this, { file, title, width, height, ground });
    this.nodes = new Map(); this.edges = []; this.bands = []; this.labels = []; this.decor = []; this.stamps = [];
  }
  add(n) {
    if (this.nodes.has(n.id)) throw new Error(`dup ${n.id}`);
    if (n.lane && n.w === undefined && !["decision", "end", "system", "action", "moodleAction"].includes(n.kind)) n.w = LANES[n.lane].w;
    if (n.h === undefined && HEIGHTS[n.id] && ["screen", "error", "outside", "note"].includes(n.kind)) n.h = HEIGHTS[n.id];
    measure(n);
    if (n.x === undefined) {
      const L = LANES[n.lane ?? "C"];
      n.x = n.align === "left" ? L.x : Math.round(L.x + (L.w - n.w) / 2);
      if (["screen", "error", "outside", "note", "interchange"].includes(n.kind) && n.align !== "center") n.x = L.x;
    }
    if (n.y === undefined && n.cy !== undefined) n.y = Math.round(n.cy - n.h / 2);
    this.nodes.set(n.id, n);
    if (n.stamp) this.stamps.push(n);
    return n;
  }
  get(id) { const n = this.nodes.get(id); if (!n) throw new Error(`no node ${id}`); return n; }
  // Place b below a with a gap, sharing a's centre x unless b has its own lane x.
  below(of, gap = 72) { const a = this.get(of); return a.y + a.h + gap; }
  edge(e) { this.edges.push(e); return e; }
  // band: background strip (Moodle), divider: stage line with label
  moodleBand(y, h) { this.bands.push({ kind: "moodle", y, h }); }
  divider(y, text) { this.bands.push({ kind: "divider", y, text }); }
  label(l) { this.labels.push(l); }

  layoutEdges() {
    for (const e of this.edges) {
      const a = this.get(e.from), b = this.get(e.to);
      const pa = anchor(a, e.fs ?? "b", e.fa), pb = anchor(b, e.ts ?? "t", e.ta);
      e.pts = route(pa, pb, e.via ?? []);
      if (e.label) {
        const segs = e.pts.slice(1).map((q, i) => [e.pts[i], q]);
        let si = e.labelSeg ?? (a.kind === "decision" ? 0 : segs.reduce((bi, s, i, arr) => (len(s) > len(arr[bi]) ? i : bi), 0));
        if (si < 0) si = segs.length + si;
        const [p, q] = segs[si];
        const w = Math.ceil(e.label.length * 7.4 + 14), hgt = 20;
        let lx, ly;
        const frac = e.labelAt ?? (a.kind === "decision" && si === 0 ? 0.5 : 0.5);
        if (p.y === q.y) {
          const mx = p.x + (q.x - p.x) * frac;
          lx = Math.round(mx - w / 2); ly = e.labelBelow ? p.y + 10 : p.y - 30;
        } else {
          const my = p.y + (q.y - p.y) * frac;
          lx = e.labelLeft ? p.x - 14 - w : p.x + 12; ly = Math.round(my - hgt / 2);
        }
        if (e.lx !== undefined) lx = e.lx; if (e.ly !== undefined) ly = e.ly;
        e.lab = { x: lx, y: ly, w, h: hgt, text: e.label };
      }
    }
  }

  html() {
    resetMarkers();
    this.layoutEdges();
    const parts = [];
    // background bands first
    for (const b of this.bands) {
      if (b.kind === "moodle") {
        parts.push(`<div style="position: absolute; left: 0; top: ${b.y}px; width: ${this.width}px; height: ${b.h}px; background: ${T.moodleSoft}"></div>`);
      }
    }
    for (const b of this.bands) {
      if (b.kind === "moodle") {
        parts.push(`<svg width="${this.width - 128}" height="8" viewBox="0 0 ${this.width - 128} 8" preserveAspectRatio="none" style="position: absolute; left: 64px; top: ${b.y - 4}px; width: ${this.width - 128}px; height: 8px; overflow: visible; fill: none; stroke: ${T.moodleLine}; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 6 4"><path d="M 0 4 L ${this.width - 128} 4"></path></svg>`);
      }
      if (b.kind === "divider") {
        parts.push(`<svg width="${this.width - 128}" height="8" viewBox="0 0 ${this.width - 128} 8" preserveAspectRatio="none" style="position: absolute; left: 64px; top: ${b.y - 4}px; width: ${this.width - 128}px; height: 8px; overflow: visible; fill: none; stroke: ${T.line}; stroke-width: 1"><path d="M 0 4 L ${this.width - 128} 4"></path></svg>`);
      }
    }
    // arrows
    for (const e of this.edges) {
      for (let i = 1; i < e.pts.length; i++) parts.push(segSvg(e.pts[i - 1], e.pts[i], e.style ?? "main", i === e.pts.length - 1));
    }
    for (const d of this.decor) parts.push(d.html);
    // cards
    for (const n of this.nodes.values()) parts.push(nodeHtml(n));
    // stamps, labels
    for (const n of this.stamps) {
      const sub = String(n.stamp).length > 1;
      const s = sub ? 28 : 34;
      parts.push(`<div style="position: absolute; left: ${n.x - 12}px; top: ${n.y - 12}px; width: ${s}px; height: ${s}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border-radius: 50%; ${sub ? `background: ${T.surface}; border: 1px solid ${T.action}; color: ${T.action}; font-size: 14px` : `background: ${T.action}; color: ${T.onAction}; font-size: 18px`}; font-family: ${SANS}; font-weight: 500; font-variant-numeric: tabular-nums; line-height: 1">${esc(n.stamp)}</div>`);
    }
    for (const b of this.bands) {
      if (b.kind === "divider") parts.push(`<div style="position: absolute; left: 64px; top: ${b.y - 30}px; height: 20px; padding-right: 10px; background: ${this.ground}; font-family: ${SANS}; font-size: 13px; line-height: 20px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.muted}">${esc(b.text)}</div>`);
      if (b.kind === "moodle") parts.push(`<div style="position: absolute; left: 64px; top: ${b.y + 14}px; height: 20px; display: flex; align-items: center; gap: 8px; font-family: ${SANS}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${T.moodleInk}">${icon("hand", 18, T.moodleInk)}<span>Daqui para baixo é no seu Moodle</span></div>`);
    }
    for (const e of this.edges) if (e.lab) {
      const c = STYLES[e.style ?? "main"].color;
      parts.push(`<div style="position: absolute; left: ${e.lab.x}px; top: ${e.lab.y}px; width: ${e.lab.w}px; height: ${e.lab.h}px; text-align: center; font-family: ${SANS}; font-size: 13px; line-height: 20px; font-weight: 500; color: ${c === T.muted ? T.ink : c}; background: ${e.lab.bg ?? this.ground}; border-radius: 4px">${esc(e.lab.text)}</div>`);
    }
    for (const l of this.labels) parts.push(l.html);
    return parts.join("\n");
  }

  check() {
    const issues = [];
    for (const e of this.edges) for (const [nid, side, at] of [[e.from, e.fs ?? "b", e.fa], [e.to, e.ts ?? "t", e.ta]]) {
      const n = this.get(nid); if (at === undefined || n.kind === "decision" || n.kind === "end") continue;
      const lim = side === "l" || side === "r" ? n.h : n.w;
      if (at < 8 || at > lim - 8) issues.push(`edge ${e.from}->${e.to} anchor at ${at}px is off the ${side} side of ${nid} (${lim}px)`);
    }
    const rects = [...this.nodes.values()].map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h }));
    const inside = (r) => r.x >= 64 && r.y >= 40 && r.x + r.w <= this.width - 64 && r.y + r.h <= this.height - 40;
    for (const r of rects) if (!inside(r)) issues.push(`card ${r.id} outside margins (${r.x},${r.y},${r.w}x${r.h})`);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (overlap(a, b, 16)) issues.push(`cards ${a.id} and ${b.id} closer than 16px`);
    }
    const segs = [];
    for (const e of this.edges) for (let i = 1; i < e.pts.length; i++) segs.push({ e, p: e.pts[i - 1], q: e.pts[i], i, last: i === e.pts.length - 1, first: i === 1 });
    for (const s of segs) {
      for (const r of rects) {
        if (r.id === s.e.from && s.first) continue;
        if (r.id === s.e.to && s.last) continue;
        if (segHitsRect(s.p, s.q, r, 6)) issues.push(`edge ${s.e.from}->${s.e.to} seg ${s.i} crosses card ${r.id}`);
      }
    }
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i], b = segs[j];
      if (a.e === b.e) continue;
      const x = segCross(a.p, a.q, b.p, b.q);
      if (x === "cross") issues.push(`edges ${a.e.from}->${a.e.to} and ${b.e.from}->${b.e.to} cross`);
      if (x === "overlap" && !(a.e.join || b.e.join)) issues.push(`edges ${a.e.from}->${a.e.to} and ${b.e.from}->${b.e.to} run on top of each other`);
    }
    const labs = this.edges.filter((e) => e.lab).map((e) => ({ ...e.lab, e }));
    for (const l of labs) {
      for (const r of rects) if (overlap(l, r, 4)) issues.push(`label "${l.text}" overlaps card ${r.id}`);
      for (const s of segs) if (segHitsRect(s.p, s.q, l, 2) && s.e !== l.e) issues.push(`label "${l.text}" sits on edge ${s.e.from}->${s.e.to}`);
      if (!inside({ ...l, y: Math.max(l.y, 40) })) issues.push(`label "${l.text}" outside margins`);
    }
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (overlap(labs[i], labs[j], 4)) issues.push(`labels "${labs[i].text}" and "${labs[j].text}" overlap`);
    for (const r of rects) if (r.y + r.h > this.height - 40) issues.push(`board too short for ${r.id}`);
    return issues;
  }
}
const len = ([p, q]) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
function overlap(a, b, pad = 0) {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}
function segHitsRect(p, q, r, pad) {
  const x1 = Math.min(p.x, q.x), x2 = Math.max(p.x, q.x), y1 = Math.min(p.y, q.y), y2 = Math.max(p.y, q.y);
  return x1 < r.x + r.w + pad && x2 > r.x - pad && y1 < r.y + r.h + pad && y2 > r.y - pad;
}
function segCross(p1, p2, p3, p4) {
  const h1 = p1.y === p2.y, h2 = p3.y === p4.y;
  if (h1 && h2) {
    if (p1.y !== p3.y) return null;
    const a1 = Math.min(p1.x, p2.x), a2 = Math.max(p1.x, p2.x), b1 = Math.min(p3.x, p4.x), b2 = Math.max(p3.x, p4.x);
    return a1 < b2 - 1 && b1 < a2 - 1 ? "overlap" : null;
  }
  if (!h1 && !h2) {
    if (p1.x !== p3.x) return null;
    const a1 = Math.min(p1.y, p2.y), a2 = Math.max(p1.y, p2.y), b1 = Math.min(p3.y, p4.y), b2 = Math.max(p3.y, p4.y);
    return a1 < b2 - 1 && b1 < a2 - 1 ? "overlap" : null;
  }
  const [h, v] = h1 ? [[p1, p2], [p3, p4]] : [[p3, p4], [p1, p2]];
  const hx1 = Math.min(h[0].x, h[1].x), hx2 = Math.max(h[0].x, h[1].x);
  const vy1 = Math.min(v[0].y, v[1].y), vy2 = Math.max(v[0].y, v[1].y);
  const x = v[0].x, y = h[0].y;
  if (x > hx1 + 1 && x < hx2 - 1 && y > vy1 + 1 && y < vy2 - 1) return "cross";
  return null;
}

/* ------------------------------------------------------------ the plan-of-lesson header + extras */
export function planHeader(board, { title, objetivo, quando, precisa, owlUrl, x = 64, y = 64, w = 1080 }) {
  const h = 196;
  const rows = [["Objetivo", objetivo], ["Quando usar", quando], ["Você vai precisar", precisa]];
  board.label({ html: `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; box-sizing: border-box; padding: 28px 32px; display: flex; align-items: flex-start; gap: 24px; background: ${T.owlSoft}; border-radius: 16px; font-family: ${SANS}; color: ${T.ink}"><img src="${owlUrl}" alt="" style="width: 72px; height: 78px; flex-shrink: 0"><span style="font-size: 15px; line-height: 23px"><span style="font-size: 38px; line-height: 46px; font-weight: 600; letter-spacing: -0.025em; color: ${T.ink}">${esc(title)}</span><br>${rows.map(([k, v]) => `<b style="font-weight: 500; color: ${T.owlInk}">${k}:</b> ${esc(v)}`).join("<br>")}</span></div>` });
  return { x, y, w, h };
}

export function caption(board, { x, y, w, text, align = "center", color = T.muted, size = 14, weight = 400 }) {
  board.label({ html: `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; text-align: ${align}; font-family: ${SANS}; font-size: ${size}px; line-height: ${Math.round(size * 1.45)}px; font-weight: ${weight}; color: ${color}">${rich(text)}</div>` });
}

export function owlImg(board, { x, y, size = 96, url, speech, speechW = 260 }) {
  const h = Math.round(size * 1.083);
  board.label({ html: `<img src="${url}" alt="Coruja do Moodle IA" style="position: absolute; left: ${x}px; top: ${y}px; width: ${size}px; height: ${h}px">` });
  if (speech) board.label({ html: `<div style="position: absolute; left: ${x + size + 12}px; top: ${y + 4}px; width: ${speechW}px; box-sizing: border-box; padding: 12px 16px; background: ${T.owlSoft}; border-radius: 16px 16px 16px 4px; font-family: ${SANS}; font-style: italic; font-size: 17px; line-height: 25px; font-weight: 400; color: ${T.owlInk}">${esc(speech)}</div>` });
}

export function lock(board, { x, y, text = "só abre sem pendências" }) {
  board.label({ html: `<div style="position: absolute; left: ${x}px; top: ${y}px; height: 28px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 6px; background: ${T.surface}; border: 1px solid ${T.control}; border-radius: 14px; box-sizing: border-box; font-family: ${SANS}; font-size: 13px; line-height: 20px; font-weight: 500; color: ${T.ink}">${icon("lock", 16, T.ink)}<span>${esc(text)}</span></div>` });
}

/* ------------------------------------------------------------ the .dc.html file */
export function dcFile(board, { fontFaces, lang = "pt-BR" }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(board.title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${fontFaces}
body{margin:0}
a{color:${T.action}}a:hover{color:${T.ink}}
</style>
</helmet>
<div style="position: relative; width: ${board.width}px; height: ${board.height}px; overflow: hidden; background: ${board.ground}; font-family: ${SANS}; color: ${T.ink}">
${board.html()}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${board.width},"height":${board.height}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
}

// Same markup as a plain page, for a local look in a browser.
export function previewFile(board, { fontFaces }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(board.title)}</title><style>${fontFaces} body{margin:0}</style></head><body>
<div style="position: relative; width: ${board.width}px; height: ${board.height}px; overflow: hidden; background: ${board.ground}; font-family: ${SANS}; color: ${T.ink}">
${board.html()}
</div></body></html>`;
}
