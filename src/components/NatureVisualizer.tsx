"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export type NatureVisualizerMode = "forest" | "moonWater";

type Props = {
  mode?: NatureVisualizerMode;
  analyser?: AnalyserNode | null;
  height?: number;
  fullscreen?: boolean;
  onTap?: () => void;
};

export default function NatureVisualizer({
  mode = "moonWater",
  analyser = null,
  height = 160,
  fullscreen = false,
  onTap,
}: Props) {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const sky = skyRef.current;
    const water = waterRef.current;
    if (!sky || !water) return;
    const skyCtx = sky.getContext("2d");
    const waterCtx = water.getContext("2d");
    if (!skyCtx || !waterCtx) return;

    const resize = () => {
      for (const c of [sky, water]) {
        const rect = c.getBoundingClientRect();
        c.width = rect.width * devicePixelRatio;
        c.height = rect.height * devicePixelRatio;
        c.getContext("2d")?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const freqBuf = new Uint8Array(analyser?.frequencyBinCount ?? 128);

    const drawForestSky = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, amp: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1a2838");
      grad.addColorStop(0.55, "#3d5a4a");
      grad.addColorStop(1, "#2a4035");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * w + Math.sin(t * 0.3 + i) * 8;
        const treeH = h * (0.35 + (i % 3) * 0.08) + amp * 20;
        ctx.fillStyle = "#1e3328";
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 18, h);
        ctx.lineTo(x + 9, h - treeH);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawMoonWaterSky = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0a1020");
      grad.addColorStop(0.6, "#152238");
      grad.addColorStop(1, "#1a2840");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 40; i++) {
        const sx = ((i * 97) % w) + Math.sin(t * 0.2 + i) * 2;
        const sy = ((i * 53) % (h * 0.55));
        ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const moonX = w * 0.72;
      const moonY = h * 0.28;
      const moonR = Math.min(w, h) * 0.1;
      ctx.fillStyle = "#f5f0dc";
      ctx.shadowColor = "rgba(245,240,220,0.6)";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#152238";
      ctx.beginPath();
      ctx.arc(moonX + moonR * 0.25, moonY - moonR * 0.1, moonR * 0.85, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawWater = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, amp: number) => {
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(30,60,90,0.85)");
      grad.addColorStop(1, "rgba(10,25,45,0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let y = 0; y < h; y += 3) {
        const wave =
          Math.sin(y * 0.08 + t * 2) * (4 + amp * 12) +
          Math.sin(y * 0.04 - t * 1.2) * (2 + amp * 6);
        ctx.strokeStyle = `rgba(126,200,227,${0.08 + (y / h) * 0.12})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 8) {
          ctx.lineTo(x, y + wave * Math.sin(x * 0.02 + t));
        }
        ctx.stroke();
      }

      if (mode === "moonWater") {
        const moonX = w * 0.72;
        const rippleY = h * 0.35 + Math.sin(t * 1.5) * 3;
        ctx.fillStyle = `rgba(245,240,220,${0.15 + amp * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(moonX, rippleY, w * 0.08 * (1 + amp * 0.3), h * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      phaseRef.current += 0.016;
      const t = phaseRef.current;
      let amp = 0.15;
      if (analyser) {
        analyser.getByteFrequencyData(freqBuf);
        amp = freqBuf.reduce((a, b) => a + b, 0) / (freqBuf.length * 255);
      }

      const sw = sky.clientWidth;
      const sh = sky.clientHeight;
      const ww = water.clientWidth;
      const wh = water.clientHeight;

      if (mode === "forest") {
        drawForestSky(skyCtx, sw, sh, t, amp);
      } else {
        drawMoonWaterSky(skyCtx, sw, sh, t);
      }
      drawWater(waterCtx, ww, wh, t, amp);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, mode, fullscreen]);

  const h = fullscreen ? "100vh" : height;
  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: h,
    borderRadius: fullscreen ? 0 : 12,
    overflow: "hidden",
    cursor: onTap ? "pointer" : "default",
    background: "#0a1020",
  };

  return (
    <div style={containerStyle} onClick={onTap} role={onTap ? "button" : undefined}>
      <canvas ref={skyRef} style={{ position: "absolute", inset: 0, width: "100%", height: "55%" }} />
      <canvas ref={waterRef} style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "48%" }} />
    </div>
  );
}
