"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface CloudPreset {
  name: string;
  density: number;
  speed: number;
  savedAt: string;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number; // 0=far, 1=mid, 2=near
  alpha: number;
  puffs: { dx: number; dy: number; r: number }[];
  turbulence: number;
  turbPhase: number;
}

function generatePuffs(w: number, h: number): { dx: number; dy: number; r: number }[] {
  const count = Math.floor(w / 28) + 2;
  return Array.from({ length: count }, (_, i) => ({
    dx: (i / (count - 1)) * w * 0.85 + w * 0.075,
    dy: h * 0.5 + Math.sin(i * 1.3) * h * 0.18,
    r: h * (0.38 + Math.abs(Math.sin(i * 0.9)) * 0.24),
  }));
}

function spawnCloud(W: number, H: number, density: number, fromLeft = false): Cloud {
  const layer = Math.random() < 0.4 ? 0 : Math.random() < 0.55 ? 1 : 2;
  const wBase = [180, 260, 340][layer];
  const hBase = [38, 52, 68][layer];
  const w = wBase + Math.random() * wBase * 0.6;
  const h = hBase + Math.random() * hBase * 0.4;
  const yBand = [H * 0.12, H * 0.22, H * 0.32][layer];
  return {
    x: fromLeft ? -w - 20 : W + 20 + Math.random() * W * 0.5,
    y: yBand + (Math.random() - 0.5) * H * 0.12,
    w, h, layer,
    alpha: [0.28, 0.42, 0.56][layer] + Math.random() * 0.12,
    puffs: generatePuffs(w, h),
    turbulence: Math.random() * 0.4 + 0.1,
    turbPhase: Math.random() * Math.PI * 2,
  };
}

export default function MoonCloudVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<Cloud[]>([]);
  const tRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const oscsRef = useRef<{ osc: OscillatorNode; gain: GainNode; base: number; baseG: number }[]>([]);

  const [density, setDensity] = useState(5);
  const [speed, setSpeed] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [presets, setPresets] = useState<CloudPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mooncloud_presets");
      if (stored) setPresets(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const getSize = useCallback(() => ({
    W: wrapRef.current?.clientWidth ?? 380,
    H: wrapRef.current?.clientHeight ?? 480,
  }), []);

  // Init clouds
  useEffect(() => {
    const { W, H } = getSize();
    const count = Math.max(2, Math.round(density * 1.2));
    cloudsRef.current = Array.from({ length: count }, (_, i) =>
      spawnCloud(W, H, density, i % 2 === 0)
    );
    // Spread them across canvas initially
    cloudsRef.current.forEach((c, i) => {
      c.x = (i / count) * W * 1.4 - W * 0.2;
    });
  }, [density, getSize]);

  // Audio
  const stopAudio = useCallback(() => {
    oscsRef.current.forEach(({ osc }) => { try { osc.stop(); } catch (_) {} });
    oscsRef.current = [];
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; analyserRef.current = null; }
  }, []);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
    analyserRef.current = analyser;
    const master = ctx.createGain(); master.gain.value = 0.15;
    master.connect(analyser); analyser.connect(ctx.destination);

    const add = (freq: number, type: OscillatorType, gain: number, detune = 0) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.value = freq; if (detune) o.detune.value = detune;
      g.gain.value = gain; o.connect(g); g.connect(master); o.start();
      oscsRef.current.push({ osc: o, gain: g, base: freq, baseG: gain });
    };
    // Ethereal moon tones
    add(36, "sine", 0.55);
    add(72, "sine", 0.32);
    add(108, "sine", 0.18, 4);
    add(144, "triangle", 0.12);
    add(216, "sine", 0.08, -3);
    add(432, "sine", 0.05);

    let run = true;
    const lfo = () => {
      if (!run) return;
      const now = ctx.currentTime;
      oscsRef.current.forEach((item, i) => {
        const sp = 0.08 + i * 0.05;
        const lv = Math.sin(now * sp) * 0.25 + Math.sin(now * sp * 0.41) * 0.12;
        item.gain.gain.setTargetAtTime(Math.max(0, item.baseG * (0.65 + lv * 0.5)), now, 0.4);
        item.osc.frequency.setTargetAtTime(item.base + Math.sin(now * (0.15 + i * 0.08)) * 1.5, now, 0.6);
      });
      setTimeout(lfo, 120);
    };
    lfo();
    return () => { run = false; };
  }, []);

  const getEnergy = useCallback(() => {
    if (!analyserRef.current || !freqRef.current) return { bass: 0, mid: 0, high: 0 };
    analyserRef.current.getByteFrequencyData(freqRef.current);
    const fd = freqRef.current;
    let bass = 0, mid = 0, high = 0;
    for (let i = 0; i < 8; i++) bass += fd[i];
    for (let i = 8; i < 32; i++) mid += fd[i];
    for (let i = 32; i < 80; i++) high += fd[i];
    return { bass: bass / (8 * 255), mid: mid / (24 * 255), high: high / (48 * 255) };
  }, []);

  // Draw cloud with realistic puffy shape
  function drawCloud(
    ctx: CanvasRenderingContext2D,
    cloud: Cloud,
    t: number,
    bass: number,
    mid: number,
    moonX: number,
    moonY: number
  ) {
    const { x, y, w, h, puffs, alpha, layer, turbulence, turbPhase } = cloud;
    const turbOffset = Math.sin(t * 0.3 + turbPhase) * turbulence * (8 + bass * 12);

    ctx.save();

    // Moon occlusion mask: clouds in front darken/glow at moon edge
    const distToMoon = Math.hypot(x + w / 2 - moonX, y + h / 2 - moonY);
    const moonR = 38;
    const nearMoon = Math.max(0, 1 - distToMoon / (moonR * 5));

    // Glow effect near moon
    if (nearMoon > 0.1 && layer >= 1) {
      ctx.shadowColor = `rgba(220,235,200,${nearMoon * 0.4})`;
      ctx.shadowBlur = 18 + nearMoon * 20;
    }

    // Build cloud shape as a soft blob
    puffs.forEach((puff, pi) => {
      const px = x + puff.dx;
      const py = y + puff.dy + turbOffset * (pi % 2 === 0 ? 1 : -0.6);
      const pr = puff.r * (1 + bass * 0.06 + Math.sin(t * 0.5 + pi * 0.8 + turbPhase) * 0.03);

      // Layer-based cloud color: far=gray, mid=silver, near=white/luminous
      const lightness = [72, 82, 92][layer] + nearMoon * 8;
      const saturation = [8, 5, 3][layer];
      const cloudAlpha = alpha * (0.7 + mid * 0.3) * (pi === 0 || pi === puffs.length - 1 ? 0.55 : 1);

      const grad = ctx.createRadialGradient(px, py - pr * 0.18, pr * 0.1, px, py, pr);
      grad.addColorStop(0, `hsla(210,${saturation}%,${Math.min(98, lightness + 8)}%,${cloudAlpha})`);
      grad.addColorStop(0.6, `hsla(210,${saturation}%,${lightness}%,${cloudAlpha * 0.85})`);
      grad.addColorStop(1, `hsla(210,${saturation + 2}%,${lightness - 12}%,0)`);

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Bottom shadow / volume
    const shadowGrad = ctx.createLinearGradient(x, y + h * 0.4, x, y + h * 1.1);
    shadowGrad.addColorStop(0, `rgba(60,70,90,0)`);
    shadowGrad.addColorStop(1, `rgba(40,50,70,${alpha * 0.35 + bass * 0.1})`);
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.85, w * 0.45, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let running = true;

    const loop = () => {
      if (!running) return;
      tRef.current += 0.01;
      const t = tRef.current;
      const { W, H } = getSize();

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
      }

      const e = getEnergy();
      const speedFactor = speed / 3; // normalize: speed=3 → 1x
      const bassBreath = e.bass * 12;

      ctx.clearRect(0, 0, W, H);

      // Sky gradient — deep indigo night
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsl(230,45%,${6 + e.mid * 3}%)`);
      sky.addColorStop(0.4, `hsl(220,38%,${10 + e.bass * 2}%)`);
      sky.addColorStop(0.75, `hsl(210,30%,${14 + e.mid * 2}%)`);
      sky.addColorStop(1, `hsl(200,22%,8%)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars (static, distant)
      if (t < 0.05) {
        // init star buffer lazily
      }
      const starSeed = 42;
      for (let i = 0; i < 55; i++) {
        const sx = ((starSeed * (i * 7 + 3)) % 1000) / 1000 * W;
        const sy = ((starSeed * (i * 13 + 7)) % 1000) / 1000 * H * 0.65;
        const sr = 0.4 + ((i * 17) % 10) / 10 * 0.8;
        const flicker = 0.5 + 0.5 * Math.sin(t * (0.3 + (i % 5) * 0.15) + i);
        ctx.globalAlpha = (0.25 + 0.35 * flicker + e.high * 0.2);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = i % 7 === 0 ? "hsl(180,60%,88%)" : "hsl(220,40%,90%)";
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Moon position — center-upper area
      const moonX = W * 0.5 + Math.sin(t * 0.04) * W * 0.04;
      const moonY = H * 0.28 + Math.cos(t * 0.03) * H * 0.015;
      const moonR = 38 + bassBreath * 0.4;

      // Moon corona glow (outer)
      for (let g = 3; g >= 0; g--) {
        const gr = moonR * (1.8 + g * 0.9);
        const corona = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, gr);
        const coronaAlpha = (0.08 - g * 0.015) * (1 + e.mid * 0.5);
        corona.addColorStop(0, `rgba(220,230,200,${coronaAlpha})`);
        corona.addColorStop(0.5, `rgba(200,215,180,${coronaAlpha * 0.4})`);
        corona.addColorStop(1, "rgba(200,215,180,0)");
        ctx.beginPath();
        ctx.arc(moonX, moonY, gr, 0, Math.PI * 2);
        ctx.fillStyle = corona;
        ctx.fill();
      }

      // Moon surface
      const moonGrad = ctx.createRadialGradient(
        moonX - moonR * 0.28, moonY - moonR * 0.28, moonR * 0.05,
        moonX, moonY, moonR
      );
      moonGrad.addColorStop(0, `rgba(252,254,248,${0.97 + e.bass * 0.03})`);
      moonGrad.addColorStop(0.55, `rgba(238,244,228,0.95)`);
      moonGrad.addColorStop(0.85, `rgba(210,222,195,0.92)`);
      moonGrad.addColorStop(1, `rgba(180,198,168,0.88)`);
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fillStyle = moonGrad;
      ctx.fill();

      // Moon craters (subtle)
      [
        { dx: -0.22, dy: -0.15, r: 0.12, a: 0.06 },
        { dx: 0.18, dy: 0.2, r: 0.09, a: 0.05 },
        { dx: -0.08, dy: 0.28, r: 0.07, a: 0.04 },
        { dx: 0.3, dy: -0.1, r: 0.06, a: 0.04 },
      ].forEach(c => {
        ctx.beginPath();
        ctx.arc(moonX + c.dx * moonR, moonY + c.dy * moonR, c.r * moonR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,160,130,${c.a})`;
        ctx.fill();
      });

      // Moonlight shimmer on water/ground (bottom)
      const shimmer = ctx.createLinearGradient(moonX - W * 0.3, H * 0.78, moonX + W * 0.3, H);
      shimmer.addColorStop(0, "rgba(200,220,180,0)");
      shimmer.addColorStop(0.4, `rgba(200,220,180,${0.04 + e.mid * 0.04})`);
      shimmer.addColorStop(1, "rgba(200,220,180,0)");
      ctx.fillStyle = shimmer;
      ctx.fillRect(moonX - W * 0.3, H * 0.78, W * 0.6, H * 0.22);

      // Far clouds (layer 0) — behind moon
      const farClouds = cloudsRef.current.filter(c => c.layer === 0);
      farClouds.forEach(c => drawCloud(ctx, c, t, e.bass, e.mid, moonX, moonY));

      // Mid clouds (layer 1) — partially over moon
      const midClouds = cloudsRef.current.filter(c => c.layer === 1);
      midClouds.forEach(c => drawCloud(ctx, c, t, e.bass, e.mid, moonX, moonY));

      // Moon edge highlight (silver lining on clouds)
      // Done inside drawCloud via nearMoon glow

      // Near clouds (layer 2) — fully in front
      const nearClouds = cloudsRef.current.filter(c => c.layer === 2);
      nearClouds.forEach(c => drawCloud(ctx, c, t, e.bass, e.mid, moonX, moonY));

      // Move clouds and manage lifecycle
      const targetCount = Math.max(2, Math.round(density * 1.5));
      cloudsRef.current.forEach(c => {
        const layerSpeedMult = [0.3, 0.55, 1.0][c.layer];
        c.x -= speedFactor * layerSpeedMult * (0.35 + e.mid * 0.2);
      });

      // Remove off-screen, spawn new
      cloudsRef.current = cloudsRef.current.filter(c => c.x + c.w > -60);
      while (cloudsRef.current.length < targetCount) {
        cloudsRef.current.push(spawnCloud(W, H, density, false));
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [density, speed, getSize, getEnergy, drawCloud]);

  const handlePlay = () => {
    if (!playing) { setPlaying(true); initAudio(); }
    else { setPlaying(false); stopAudio(); }
  };

  const savePreset = () => {
    const name = presetName.trim() || `設定 ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
    const newPreset: CloudPreset = {
      name, density, speed,
      savedAt: new Date().toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [...presets, newPreset].slice(-8); // keep last 8
    setPresets(updated);
    try { localStorage.setItem("mooncloud_presets", JSON.stringify(updated)); } catch (_) {}
    setPresetName("");
    setSavedMsg(`「${name}」を保存しました`);
    setTimeout(() => setSavedMsg(""), 2200);
  };

  const loadPreset = (p: CloudPreset) => {
    setDensity(p.density);
    setSpeed(p.speed);
    setSavedMsg(`「${p.name}」を読み込みました`);
    setTimeout(() => setSavedMsg(""), 1800);
  };

  const deletePreset = (i: number) => {
    const updated = presets.filter((_, idx) => idx !== i);
    setPresets(updated);
    try { localStorage.setItem("mooncloud_presets", JSON.stringify(updated)); } catch (_) {}
  };

  const densityLabel = ["わずか", "少なめ", "ふつう", "多め", "厚い", "覆い", "嵐"][Math.min(6, Math.round(density) - 1)] ?? "ふつう";
  const speedLabel = ["静止", "微風", "そよ風", "風", "強風", "疾風", "嵐"][Math.min(6, Math.round(speed) - 1)] ?? "そよ風";

  return (
    <div style={{ position: "relative", width: "100%", fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
      {/* Canvas */}
      <div
        ref={wrapRef}
        style={{ position: "relative", width: "100%", height: 480, borderRadius: 16, overflow: "hidden", background: "#060a14" }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />

        {/* Top controls */}
        <div style={{
          position: "absolute", top: 14, left: 14, right: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          zIndex: 10, pointerEvents: "none",
        }}>
          <div style={{ fontSize: 11, color: "rgba(220,230,210,0.5)", letterSpacing: "0.15em", fontFamily: "sans-serif" }}>
            月夜の雲流れ
          </div>
          <div style={{ fontSize: 11, color: "rgba(220,230,210,0.45)", letterSpacing: "0.08em", fontFamily: "sans-serif" }}>
            {densityLabel} · {speedLabel}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 10, zIndex: 10,
          background: "rgba(8,12,22,0.55)", border: "0.5px solid rgba(200,215,180,0.18)",
          borderRadius: 40, padding: "7px 18px", backdropFilter: "blur(10px)",
        }}>
          {/* Play */}
          <button onClick={handlePlay} style={{
            width: 34, height: 34, borderRadius: "50%",
            border: "1px solid rgba(200,215,180,0.4)",
            background: "rgba(200,215,180,0.08)", color: "rgba(220,235,200,0.9)",
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {playing ? "⏸" : "▶"}
          </button>
          {/* Settings toggle */}
          <button onClick={() => setShowSettings(s => !s)} style={{
            height: 34, borderRadius: 17, padding: "0 14px",
            border: `0.5px solid rgba(200,215,180,${showSettings ? 0.5 : 0.2})`,
            background: showSettings ? "rgba(200,215,180,0.14)" : "transparent",
            color: "rgba(220,235,200,0.8)", fontSize: 12, cursor: "pointer",
            fontFamily: "sans-serif", letterSpacing: "0.05em",
          }}>
            ⚙ 設定
          </button>
        </div>

        {/* Toast */}
        {savedMsg && (
          <div style={{
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            background: "rgba(8,16,28,0.75)", border: "0.5px solid rgba(200,215,180,0.3)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12,
            color: "rgba(220,235,200,0.9)", fontFamily: "sans-serif",
            zIndex: 20, backdropFilter: "blur(8px)", whiteSpace: "nowrap",
          }}>
            {savedMsg}
          </div>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{
          marginTop: 8, borderRadius: 14,
          background: "linear-gradient(135deg, rgba(8,14,26,0.97) 0%, rgba(10,18,30,0.97) 100%)",
          border: "0.5px solid rgba(200,215,180,0.15)",
          padding: "20px 20px 16px",
          backdropFilter: "blur(12px)",
        }}>
          {/* Sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Density */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(200,215,180,0.6)", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>雲の量</span>
                <span style={{ fontSize: 13, color: "rgba(220,235,200,0.9)", fontFamily: "sans-serif" }}>{densityLabel}</span>
              </div>
              <input type="range" min={1} max={7} step={0.1} value={density}
                onChange={e => setDensity(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "rgba(200,215,180,0.7)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(200,215,180,0.3)", marginTop: 4, fontFamily: "sans-serif" }}>
                <span>わずか</span><span>嵐</span>
              </div>
            </div>
            {/* Speed */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(200,215,180,0.6)", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>風の速さ</span>
                <span style={{ fontSize: 13, color: "rgba(220,235,200,0.9)", fontFamily: "sans-serif" }}>{speedLabel}</span>
              </div>
              <input type="range" min={1} max={7} step={0.1} value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "rgba(200,215,180,0.7)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(200,215,180,0.3)", marginTop: 4, fontFamily: "sans-serif" }}>
                <span>静止</span><span>嵐</span>
              </div>
            </div>
          </div>

          {/* Save preset */}
          <div style={{ borderTop: "0.5px solid rgba(200,215,180,0.1)", paddingTop: 16, marginBottom: presets.length > 0 ? 16 : 0 }}>
            <div style={{ fontSize: 11, color: "rgba(200,215,180,0.5)", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "sans-serif" }}>お気に入りとして保存</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) savePreset(); }}
                placeholder="名前を入力（省略可）"
                style={{
                  flex: 1, height: 34, borderRadius: 8, border: "0.5px solid rgba(200,215,180,0.2)",
                  background: "rgba(200,215,180,0.06)", color: "rgba(220,235,200,0.9)",
                  fontSize: 12, padding: "0 12px", outline: "none", fontFamily: "sans-serif",
                }}
              />
              <button onClick={savePreset} style={{
                height: 34, padding: "0 16px", borderRadius: 8,
                border: "0.5px solid rgba(200,215,180,0.35)",
                background: "rgba(200,215,180,0.1)", color: "rgba(220,235,200,0.9)",
                fontSize: 12, cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap",
              }}>
                ★ 保存
              </button>
            </div>
          </div>

          {/* Preset list */}
          {presets.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "rgba(200,215,180,0.5)", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "sans-serif" }}>保存したお気に入り</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {presets.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(200,215,180,0.05)", borderRadius: 8,
                    border: "0.5px solid rgba(200,215,180,0.1)", padding: "8px 12px",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "rgba(220,235,200,0.9)", fontFamily: "sans-serif", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(200,215,180,0.4)", fontFamily: "sans-serif" }}>
                        雲 {Math.round(p.density * 10) / 10} · 風 {Math.round(p.speed * 10) / 10} · {p.savedAt}
                      </div>
                    </div>
                    <button onClick={() => loadPreset(p)} style={{
                      height: 28, padding: "0 12px", borderRadius: 6,
                      border: "0.5px solid rgba(200,215,180,0.25)",
                      background: "rgba(200,215,180,0.08)", color: "rgba(220,235,200,0.8)",
                      fontSize: 11, cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap",
                    }}>
                      読込
                    </button>
                    <button onClick={() => deletePreset(i)} style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: "0.5px solid rgba(200,100,80,0.25)",
                      background: "transparent", color: "rgba(200,120,100,0.7)",
                      fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
