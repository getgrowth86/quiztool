'use client';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function MultipleChoice({ value, onChange, options }: Props) {
  const selected: string[] = value ? JSON.parse(value) : [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange(JSON.stringify(next));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = KEYS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < options.length) {
        toggle(options[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options, selected]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`flex items-center gap-4 text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 text-lg group hover:border-purple-400 ${
              isSelected
                ? 'border-purple-500 bg-purple-500/20 text-white'
                : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
            }`}
          >
            <span className={`flex-shrink-0 w-8 h-8 rounded-md border-2 flex items-center justify-center text-sm font-bold transition-colors ${
              isSelected ? 'border-purple-400 bg-purple-500 text-white' : 'border-white/30 text-gray-400 group-hover:border-purple-400'
            }`}>
              {isSelected ? '✓' : KEYS[i]}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
      <p className="text-sm text-gray-400 mt-2">Alle zutreffenden auswählen, dann <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Enter ↵</kbd> drücken</p>
    </div>
  );
}
