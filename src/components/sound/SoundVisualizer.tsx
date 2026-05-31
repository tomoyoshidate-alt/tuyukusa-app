'use client';

import { useEffect, useRef } from "react";
import type { OverlayOption, VisualizerEffect } from "@/src/lib/soundSystem/types";

type Props = {
  analyser: AnalyserNode | null;
  effect: VisualizerEffect;
  overlays: OverlayOption[];
  presetRemainingSec: number;
  pomodoroRemainingSec?: number;
  scheduleRemainingSec?: number;
  fullscreen?: boolean;
  onTap?: () => void;
};

function formatClock(d: Date): string {
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SoundVisualizer({
  analyser,
  effect,
  overlays,
  presetRemainingSec,
  pomodoroRemainingSec = 0,
  scheduleRemainingSec = 0,
  fullscreen = false,
  onTap,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const buf = new Uint8Array(analyser?.frequencyBinCount ?? 1024);
    const timeBuf = new Uint8Array(analyser?.fftSize ?? 2048);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.fillStyle = "rgba(10, 8, 6, 0.35)";
      ctx2d.fillRect(0, 0, w, h);

      if (analyser) {
        analyser.getByteFrequencyData(buf);
        analyser.getByteTimeDomainData(timeBuf);
      }

      const cx = w / 2;
      const cy = h / 2;
      const avg = buf.reduce((a, b) => a + b, 0) / (buf.length || 1);

      switch (effect) {
        case "waveform": {
          ctx2d.strokeStyle = "#7ec8e3";
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          for (let i = 0; i < timeBuf.length; i++) {
            const x = (i / timeBuf.length) * w;
            const y = ((timeBuf[i] - 128) / 128) * (h * 0.35) + cy;
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
          }
          ctx2d.stroke();
          break;
        }
        case "circle": {
          const radius = Math.min(w, h) * 0.22;
          for (let i = 0; i < buf.length; i += 4) {
            const angle = (i / buf.length) * Math.PI * 2;
            const amp = buf[i] / 255;
            const r = radius + amp * radius * 0.8;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            ctx2d.fillStyle = `hsla(${200 + amp * 80}, 70%, 65%, ${0.35 + amp * 0.5})`;
            ctx2d.beginPath();
            ctx2d.arc(x, y, 2 + amp * 4, 0, Math.PI * 2);
            ctx2d.fill();
          }
          break;
        }
        case "particle": {
          if (particlesRef.current.length < 80 && Math.random() < 0.4) {
            particlesRef.current.push({
              x: Math.random() * w,
              y: h,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 3 - avg / 80,
              life: 1,
            });
          }
          particlesRef.current = particlesRef.current
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.012 }))
            .filter(p => p.life > 0);
          particlesRef.current.forEach(p => {
            ctx2d.fillStyle = `rgba(232, 168, 106, ${p.life})`;
            ctx2d.beginPath();
            ctx2d.arc(p.x, p.y, 2 + p.life * 3, 0, Math.PI * 2);
            ctx2d.fill();
          });
          break;
        }
        case "spiral": {
          ctx2d.strokeStyle = "#c9a0dc";
          ctx2d.lineWidth = 1.5;
          ctx2d.beginPath();
          for (let i = 0; i < 360; i++) {
            const t = i / 360;
            const amp = buf[i % buf.length] / 255;
            const r = t * Math.min(w, h) * 0.4 * (0.6 + amp);
            const angle = t * Math.PI * 6 + performance.now() / 2000;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
          }
          ctx2d.stroke();
          break;
        }
        case "aurora": {
          for (let band = 0; band < 4; band++) {
            ctx2d.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const idx = Math.floor((x / w) * buf.length);
              const amp = buf[idx] / 255;
              const y =
                cy +
                Math.sin(x / 60 + performance.now() / 1200 + band) * (40 + amp * 60) +
                band * 18;
              if (x === 0) ctx2d.moveTo(x, y);
              else ctx2d.lineTo(x, y);
            }
            ctx2d.strokeStyle = `rgba(${80 + band * 40}, ${180 + band * 10}, 220, 0.45)`;
            ctx2d.lineWidth = 3;
            ctx2d.stroke();
          }
          break;
        }
        case "stars": {
          for (let i = 0; i < 60; i++) {
            const idx = (i * 17) % buf.length;
            const amp = buf[idx] / 255;
            const x = ((i * 97) % 1000) / 1000 * w;
            const y = ((i * 53) % 1000) / 1000 * h;
            const size = 1 + amp * 3;
            ctx2d.fillStyle = `rgba(255,255,255,${0.2 + amp * 0.8})`;
            ctx2d.fillRect(x, y, size, size);
          }
          break;
        }
        case "petals": {
          for (let i = 0; i < 24; i++) {
            const idx = (i * 8) % buf.length;
            const amp = buf[idx] / 255;
            const angle = (i / 24) * Math.PI * 2 + performance.now() / 3000;
            const r = Math.min(w, h) * 0.15 + amp * 40;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            ctx2d.fillStyle = `rgba(255, 182, 193, ${0.4 + amp * 0.5})`;
            ctx2d.beginPath();
            ctx2d.ellipse(x, y, 8 + amp * 6, 4 + amp * 3, angle, 0, Math.PI * 2);
            ctx2d.fill();
          }
          break;
        }
      }

      const showNone = overlays.includes("none");
      if (!showNone) {
        ctx2d.font = fullscreen ? "18px sans-serif" : "13px sans-serif";
        ctx2d.fillStyle = "rgba(245,240,232,0.85)";
        const lines: string[] = [];
        if (overlays.includes("clock")) lines.push(`${formatClock(new Date())}`);
        if (overlays.includes("pomodoro") && pomodoroRemainingSec > 0) {
          lines.push(`${formatDuration(pomodoroRemainingSec)}`);
        }
        if (overlays.includes("schedule") && scheduleRemainingSec > 0) {
          lines.push(`${formatDuration(scheduleRemainingSec)}`);
        }
        if (overlays.includes("presetTimer") && presetRemainingSec > 0) {
          lines.push(`${formatDuration(presetRemainingSec)}`);
        }
        lines.forEach((line, i) => ctx2d.fillText(line, 16, 24 + i * 22));
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, effect, overlays, presetRemainingSec, pomodoroRemainingSec, scheduleRemainingSec, fullscreen]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onTap}
      style={{
        width: "100%",
        height: fullscreen ? "100vh" : 160,
        display: "block",
        borderRadius: fullscreen ? 0 : 12,
        background: "rgba(0,0,0,0.25)",
        cursor: onTap ? "pointer" : "default",
      }}
    />
  );
}
