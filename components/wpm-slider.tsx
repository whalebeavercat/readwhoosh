type WPMSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function WPMSlider({ value, onChange }: WPMSliderProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-xs uppercase tracking-[0.22em] text-neutral-400">
      WPM {value}
      <input
        type="range"
        min={100}
        max={1000}
        step={10}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-red-400"
      />
    </label>
  );
}
