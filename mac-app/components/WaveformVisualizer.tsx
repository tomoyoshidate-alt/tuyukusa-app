"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  getAnalyser: () => AnalyserNode | null;
};

export function WaveformVisualizer({ active, getAnalyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const analyser = getAnalyser();
      if (!analyser) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(buffer);
      const { width, height } = canvas;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#5DCAA5";
      ctx.beginPath();
      for (let i = 0; i < buffer.length; i += 1) {
        const x = (i / buffer.length) * width;
        const y = (buffer[i] / 255) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, getAnalyser]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={80}
      className="w-full rounded-lg border border-[#333] bg-[#1a1a1a]"
    />
  );
}
