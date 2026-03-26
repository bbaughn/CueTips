"use client";

import { useRef, useEffect } from "react";

const COLORS: [number, number, number][] = [
  [255, 252, 68],  // 0: Yellow
  [133, 175, 64],  // 1: Spring
  [88, 172, 44],   // 2: Green
  [82, 192, 168],  // 3: Aqua
  [105, 190, 227], // 4: Light Blue
  [50, 131, 185],  // 5: Blue
  [89, 90, 163],   // 6: Purple
  [151, 54, 176],  // 7: Light Purple
  [227, 115, 179], // 8: Pink
  [223, 64, 27],   // 9: Red
  [233, 112, 47],  // 10: Orange
  [242, 146, 43],  // 11: Melon
];

// Original sketch.js dimensions (unscaled)
const S = {
  DISC: 156,
  HEIGHT: 216,
  DISC_CY: 98,          // 20 + 156/2
  INNER_CIRCLE: 98,
  CENTER_CIRCLE: 31,
  NO_DRUMS_STROKE: 15,
  DISC_OFFSET: 6,
  RIGHT_MARGIN: 8,
  TOP_MARGIN: 8,
  BPM_TOP: 29,
  KEY_BOTTOM_OFFSET: 70,
  RANGE_MARGIN: 42,
  RANGE_BAR_W: 9,
  RANGE_SMALL_H: 4,
  RANGE_LARGE_H: 10,
  RANGE_SPACING: 10,
  DISC_SPACING: 10,
  SWING_DIA: 30,
  PERC_W: 40,
  PERC_H: 30,
  HOUR_TEXT_R: 33.5,
  MIN_TEXT_R: 64,
  FONT_SIZE: 24,
};

const FALLBACK_FONT = "sans-serif";

interface DiscDiagramProps {
  hour: number | null;
  minute: number | null;
  range?: number | null;
  bpm?: number | null;
  root?: string | null;
  tuning?: number | null;
  barsPercussion?: number | null;
  swing?: boolean | null;
  noDrums?: boolean;
  size?: number;
}

function lerp(v: number, a: number, b: number, c: number, d: number): number {
  return c + ((v - a) * (d - c)) / (b - a);
}

function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---------------------------------------------------------------------------
// Key text helpers (matching sketch.js drawKey)
// ---------------------------------------------------------------------------

function formatKey(root: string, tuning: number): string {
  let k = root.replace("b", "\u266D"); // ♭
  if (tuning !== 0) k += (tuning > 0 ? "+" : "") + tuning + "c";
  return k;
}

function measureKeyText(
  ctx: CanvasRenderingContext2D,
  root: string,
  tuning: number,
  flatW: number,
): number {
  const formatted = formatKey(root, tuning);
  let w = 0;
  for (const ch of formatted) {
    w += ch === "\u266D" ? flatW : ctx.measureText(ch).width;
  }
  return w;
}

function drawKeyText(
  ctx: CanvasRenderingContext2D,
  root: string,
  tuning: number,
  x: number,
  y: number,
  flatW: number,
  fontFamily: string,
  fontSize: number,
) {
  const formatted = formatKey(root, tuning);
  let xPos = x;
  let firstCharW = 0;

  // Draw non-flat chars and track positions
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];
    if (ch === "\u266D") {
      xPos += flatW;
    } else {
      ctx.fillText(ch, xPos, y);
      xPos += ctx.measureText(ch).width;
    }
    if (i === 0) firstCharW = xPos - x;
  }

  // Draw flat symbol at 70% size with offset (matching sketch.js)
  if (formatted.includes("\u266D")) {
    const origFont = ctx.font;
    ctx.font = `600 ${Math.round(fontSize * 0.7)}px ${fontFamily}`;
    ctx.fillText("\u266D", x + firstCharW - fontSize * 0.17, y + fontSize * 0.13);
    ctx.font = origFont;
  }
}

// ---------------------------------------------------------------------------
// Range markers (matching sketch.js drawRangeMarkers)
// ---------------------------------------------------------------------------

function drawRangeMarkers(
  ctx: CanvasRenderingContext2D,
  range: number | null,
  rightEdgeX: number,
  sc: number,
  fontFamily: string,
) {
  const fontSize = Math.round(S.FONT_SIZE * sc);
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const barX = rightEdgeX - S.RANGE_MARGIN * sc - S.RANGE_BAR_W * sc;
  let markerY = S.TOP_MARGIN * sc;
  let currentRange = 5;

  for (let i = 0; i < 12; i++) {
    const h = ((i % 2 === 1) ? S.RANGE_LARGE_H : S.RANGE_SMALL_H) * sc;
    const isCurrent =
      range != null && (range === currentRange || (range === 0 && currentRange === 12));

    ctx.fillStyle = isCurrent ? "black" : "rgb(179,179,179)";
    ctx.fillRect(barX, markerY, S.RANGE_BAR_W * sc, h);

    if (isCurrent) {
      ctx.fillStyle = "black";
      ctx.fillText(
        String(currentRange),
        barX + S.RANGE_BAR_W * sc + 7 * sc,
        markerY + h / 2 + 2 * sc,
      );
    }

    markerY += h + S.RANGE_SPACING * sc;
    currentRange = currentRange === 1 ? 12 : currentRange - 1;
  }
}

// ---------------------------------------------------------------------------
// Disc drawing (unchanged logic from before)
// ---------------------------------------------------------------------------

function drawDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hour: number | null,
  minute: number | null,
  range: number | null,
  tuning: number,
  noDrums: boolean,
  sc: number,
  fontFamily: string,
) {
  const discR = S.DISC / 2 * sc;
  const innerR = S.INNER_CIRCLE / 2 * sc;
  const centerR = S.CENTER_CIRCLE / 2 * sc;

  const hasHour = hour != null;
  const hasMinute = minute != null;

  const discColor = range != null
    ? COLORS[range % 12]
    : ([60, 60, 60] as [number, number, number]);
  const innerColor = hasMinute
    ? COLORS[Math.floor(minute / 5)]
    : ([40, 40, 40] as [number, number, number]);

  // Outer disc
  ctx.fillStyle = rgb(discColor);
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, 2 * Math.PI);
  ctx.fill();

  // Minute arc
  if (hasMinute) {
    ctx.fillStyle = "white";
    const a0 = lerp(minute - 5 - 15, 0, 60, 0, 2 * Math.PI);
    const a1 = lerp(minute + 5 - 15, 0, 60, 0, 2 * Math.PI);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, discR + 1, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // Inner circle
  const nds = noDrums ? S.NO_DRUMS_STROKE * sc : 0;
  const drawnR = innerR + nds / 2;
  ctx.fillStyle = rgb(innerColor);
  ctx.strokeStyle = "white";
  ctx.lineWidth = noDrums ? S.NO_DRUMS_STROKE * sc : 2.5 * sc;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, drawnR, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2.5 * sc;

  // Hour arc
  if (hasHour) {
    ctx.fillStyle = "white";
    const a0 = lerp(hour - 1 - 3, 0, 12, 0, 2 * Math.PI);
    const a1 = lerp(hour + 1 - 3, 0, 12, 0, 2 * Math.PI);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerR, a0, a1);
    ctx.closePath();
    ctx.fill();
  }

  // Text on disc
  const fontSize = Math.round(S.FONT_SIZE * sc);
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (hasHour) {
    const a = lerp(hour, 0, 12, -Math.PI / 2, (3 * Math.PI) / 2);
    const tx = cx + Math.cos(a) * S.HOUR_TEXT_R * sc;
    const ty = cy + Math.sin(a) * S.HOUR_TEXT_R * sc;
    ctx.fillText(hour === 0 ? "12" : String(hour), tx, ty);
  }

  if (hasMinute) {
    const a = lerp(minute, 0, 60, -Math.PI / 2, (3 * Math.PI) / 2);
    const tx = cx + Math.cos(a) * S.MIN_TEXT_R * sc;
    const ty = cy + Math.sin(a) * S.MIN_TEXT_R * sc;
    let txt = minute < 10 ? `0${minute}` : String(minute);
    if (tuning !== 0) txt += "!";
    ctx.fillText(txt, tx, ty);
  }

  // Center circle
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, 2 * Math.PI);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiscDiagram({
  hour,
  minute,
  range,
  bpm,
  root,
  tuning,
  barsPercussion,
  swing,
  noDrums = false,
  size = 156,
}: DiscDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function render() {
      const cvs = canvasRef.current;
      if (!cvs) return;

      const sc = size / S.DISC;
      const discVar = getComputedStyle(document.body)
        .getPropertyValue("--font-disc")
        .trim();
      const fontFamily = discVar ? `${discVar}, ${FALLBACK_FONT}` : FALLBACK_FONT;
      const fontSize = Math.round(S.FONT_SIZE * sc);

      // --- Phase 1: measure text to calculate layout width ---
      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = `600 ${fontSize}px ${fontFamily}`;
      const flatW = 10 * sc; // fixed flat symbol width (sketch.js)

      const bpmText = bpm != null ? String(bpm) : null;
      const bpmW = bpmText ? measure.measureText(bpmText).width : 0;
      const keyW = root ? measureKeyText(measure, root, tuning ?? 0, flatW) : 0;
      const labelW = Math.max(bpmW, keyW);

      const hasPerc = barsPercussion != null && barsPercussion !== 0;
      const hasSwing = swing === true;

      // --- Phase 2: calculate layout (right-to-left offsets) ---
      let xOff = S.RIGHT_MARGIN * sc;

      // Range markers block
      const rangeBlockW = (S.RANGE_MARGIN + S.RANGE_BAR_W + S.DISC_SPACING) * sc;
      const rangeRightEdge = xOff; // range markers draw relative to right edge
      xOff += rangeBlockW;

      // Disc + labels
      const discW = S.DISC * sc;
      const discOff = S.DISC_OFFSET * sc;
      xOff += discW + discOff + labelW + 2 * sc; // +2 matches sketch.js gap

      // Swing / perc markers (left of disc)
      const markerBaseOff = xOff;
      let swingOff = xOff;
      let percOff = xOff;
      if (hasSwing) swingOff = markerBaseOff + 8 * sc + S.SWING_DIA * sc / 2;
      if (hasPerc) percOff = markerBaseOff + S.PERC_W * sc - 5 * sc;
      xOff = Math.max(xOff, swingOff, percOff);

      // Left margin
      xOff += (S.RIGHT_MARGIN + 8) * sc;

      const totalW = Math.ceil(xOff);
      const totalH = Math.ceil(S.HEIGHT * sc);

      // --- Phase 3: size canvas and draw ---
      const dpr = window.devicePixelRatio || 1;
      cvs.width = totalW * dpr;
      cvs.height = totalH * dpr;
      cvs.style.width = `${totalW}px`;
      cvs.style.height = `${totalH}px`;

      const ctx = cvs.getContext("2d")!;
      ctx.scale(dpr, dpr);

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, totalW, totalH);

      // Coordinate helper: sketch.js uses "offset from right edge"
      // Our canvas origin is left, so: canvasX = totalW - offset
      const R = totalW; // right edge

      // --- Range markers ---
      drawRangeMarkers(ctx, range ?? null, R - rangeRightEdge, sc, fontFamily);

      // --- Disc ---
      const turntableRightX = R - rangeRightEdge - rangeBlockW;
      // In sketch.js: discRightX = x - widerWidth + DISC_OFFSET
      const discRightX = turntableRightX - labelW + discOff;
      const discCX = discRightX - discW / 2;
      const discCY = S.DISC_CY * sc;

      drawDisc(ctx, discCX, discCY, hour, minute, range ?? null, tuning ?? 0, noDrums, sc, fontFamily);

      // --- BPM label (left of disc, top) ---
      if (bpmText) {
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(bpmText, turntableRightX - labelW - 2 * sc, S.BPM_TOP * sc);
      }

      // --- Key label (left of disc, bottom) ---
      if (root) {
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        drawKeyText(
          ctx,
          root,
          tuning ?? 0,
          turntableRightX - labelW - 2 * sc,
          totalH - S.KEY_BOTTOM_OFFSET * sc,
          flatW,
          fontFamily,
          fontSize,
        );
      }

      // --- Swing marker ---
      if (hasSwing) {
        const sx = R - markerBaseOff - 8 * sc;
        const sy = 45 * sc;
        ctx.fillStyle = "rgb(179,179,179)";
        ctx.beginPath();
        ctx.arc(sx, sy, S.SWING_DIA * sc / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", sx, sy + 2 * sc);
      }

      // --- Perc marker ---
      if (hasPerc) {
        const px = R - markerBaseOff - S.PERC_W * sc + 5 * sc;
        const py = totalH - 50 * sc - S.PERC_H * sc;
        ctx.fillStyle = "rgb(179,179,179)";
        ctx.fillRect(px, py, S.PERC_W * sc, S.PERC_H * sc);
        ctx.fillStyle = "black";
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(barsPercussion),
          px + S.PERC_W * sc / 2,
          py + S.PERC_H * sc / 2 + 2 * sc,
        );
      }
    }

    document.fonts.ready.then(render);
  }, [hour, minute, range, bpm, root, tuning, barsPercussion, swing, noDrums, size]);

  return <canvas ref={canvasRef} />;
}
