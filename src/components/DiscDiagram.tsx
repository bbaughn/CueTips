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

interface DiscDiagramProps {
  hour: number | null;
  minute: number | null;
  tuning?: number | null;
  noDrums?: boolean;
  size?: number;
}

function lerp(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function drawDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hour: number | null,
  minute: number | null,
  tuning: number,
  noDrums: boolean,
  scale: number,
) {
  const s = (v: number) => v * scale;

  const discRadius = s(78); // 156 / 2
  const innerRadius = s(49); // 98 / 2
  const centerRadius = s(15.5); // 31 / 2
  const hourTextRadius = s(33.5);
  const minTextRadius = s(64);

  const hasHour = hour != null;
  const hasMinute = minute != null;

  const discColor = hasHour ? COLORS[hour % 12] : [60, 60, 60] as [number, number, number];
  const innerColor = hasMinute ? COLORS[Math.floor(minute / 5)] : [40, 40, 40] as [number, number, number];

  // --- Outer disc ---
  ctx.fillStyle = rgb(discColor);
  ctx.beginPath();
  ctx.arc(cx, cy, discRadius, 0, 2 * Math.PI);
  ctx.fill();

  // --- Minute arc marker (white wedge on outer disc) ---
  if (hasMinute) {
    ctx.fillStyle = "white";
    const startMin = lerp(minute - 5 - 15, 0, 60, 0, 2 * Math.PI);
    const endMin = lerp(minute + 5 - 15, 0, 60, 0, 2 * Math.PI);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, discRadius, startMin, endMin);
    ctx.closePath();
    ctx.fill();
  }

  // --- Inner circle ---
  const noDrumsStroke = noDrums ? s(15) : 0;
  const drawnInnerRadius = innerRadius + noDrumsStroke / 2;
  const strokeWidth = noDrums ? s(15) : s(2.5);

  ctx.fillStyle = rgb(innerColor);
  ctx.strokeStyle = "white";
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, drawnInnerRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // Reset line width for subsequent drawing
  ctx.lineWidth = s(2.5);

  // --- Hour arc marker (white wedge on inner circle) ---
  if (hasHour) {
    ctx.fillStyle = "white";
    const startHour = lerp(hour - 1 - 3, 0, 12, 0, 2 * Math.PI);
    const endHour = lerp(hour + 1 - 3, 0, 12, 0, 2 * Math.PI);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, innerRadius, startHour, endHour);
    ctx.closePath();
    ctx.fill();
  }

  // --- Text setup ---
  const fontSize = Math.round(s(24));
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --- Hour text (radial position on inner circle) ---
  if (hasHour) {
    const hourAngle = lerp(hour, 0, 12, -Math.PI / 2, (3 * Math.PI) / 2);
    const hourX = cx + Math.cos(hourAngle) * hourTextRadius;
    const hourY = cy + Math.sin(hourAngle) * hourTextRadius;
    ctx.fillText(hour === 0 ? "12" : String(hour), hourX, hourY);
  }

  // --- Minute text (radial position on outer disc) ---
  if (hasMinute) {
    const minAngle = lerp(minute, 0, 60, -Math.PI / 2, (3 * Math.PI) / 2);
    const minX = cx + Math.cos(minAngle) * minTextRadius;
    const minY = cy + Math.sin(minAngle) * minTextRadius;
    let minDisplay = minute < 10 ? `0${minute}` : String(minute);
    if (tuning !== 0) minDisplay += "!";
    ctx.fillText(minDisplay, minX, minY);
  }

  // --- Center circle ---
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx, cy, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
}

export default function DiscDiagram({
  hour,
  minute,
  tuning,
  noDrums = false,
  size = 156,
}: DiscDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const pad = 4;
    const cssSize = size + pad * 2;

    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const scale = size / 156;
    drawDisc(
      ctx,
      cssSize / 2,
      cssSize / 2,
      hour,
      minute,
      tuning ?? 0,
      noDrums,
      scale,
    );
  }, [hour, minute, tuning, noDrums, size]);

  const cssSize = size + 8;
  return (
    <canvas
      ref={canvasRef}
      style={{ width: cssSize, height: cssSize }}
    />
  );
}
