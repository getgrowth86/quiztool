'use client';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  options: string[];
}

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function SingleChoice({ value, onChange, onSubmit, options }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = KEYS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < options.length) {
        const selected = options[idx];
        onChange(selected);
        setTimeout(onSubmit, 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options, onChange, onSubmit]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => { onChange(opt); setTimeout(onSubmit, 300); }}
            className={`flex items-center gap-4 text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 text-lg group hover:border-purple-400 ${
              selected
                ? 'border-purple-500 bg-purple-500/20 text-white'
                : 'border-white/20 bg-white/5 text-gray-200 hover:bg-white/10'
            }`}
          >
            <span className={`flex-shrink-0 w-8 h-8 rounded-md border-2 flex items-center justify-center text-sm font-bold transition-colors ${
              selected ? 'border-purple-400 bg-purple-500 text-white' : 'border-white/30 text-gray-400 group-hover:border-purple-400'
            }`}>
              {KEYS[i]}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
