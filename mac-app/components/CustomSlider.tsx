"use client";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
};

export function CustomSlider({ label, value, min, max, step = 1, unit = "", onChange }: Props) {
  return (
    <label className="block mb-4">
      <div className="flex justify-between text-xs mb-1.5 font-mono text-[#a8a8a8]">
        <span>{label}</span>
        <span className="text-[#5DCAA5]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mac-slider w-full"
      />
    </label>
  );
}
