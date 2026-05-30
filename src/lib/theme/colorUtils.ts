export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return {
    r: hue2rgb(hue + 1 / 3) * 255,
    g: hue2rgb(hue) * 255,
    b: hue2rgb(hue - 1 / 3) * 255,
  };
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb);
  return rgbToHex(hslToRgb(h, s, Math.min(1, l + amount)));
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb);
  return rgbToHex(hslToRgb(h, s, Math.max(0, l - amount)));
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Derive accent palette from user-selected base color */
export function derivePaletteFromBase(baseColor: string): Record<string, string> {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return {};
  const { h, s } = rgbToHsl(rgb);
  const primary = rgbToHex(hslToRgb(h, Math.min(1, s * 0.85 + 0.1), 0.38));
  const primaryLight = rgbToHex(hslToRgb(h, Math.min(1, s * 0.7 + 0.05), 0.52));
  const accent = rgbToHex(hslToRgb(h, Math.min(1, s * 0.9 + 0.05), 0.55));
  const accentBg = rgbToHex(hslToRgb(h, Math.min(1, s * 0.5), 0.92));
  const primaryBg = rgbToHex(hslToRgb(h, Math.min(1, s * 0.35), 0.94));
  const navActive = rgbToHex(hslToRgb(h, Math.min(1, s * 0.85), 0.62));
  return {
    "--t-primary": primary,
    "--t-primary-light": primaryLight,
    "--t-accent": accent,
    "--t-accent-bg": accentBg,
    "--t-primary-bg": primaryBg,
    "--t-nav-active": navActive,
    "--t-checkbox-accent": accent,
  };
}
