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
            className={`flex items-center gap-4 text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 text-lg group hover:border-[#111827] ${
              selected
                ? 'border-[#111827] bg-[#111827]/5 text-[#111827]'
                : 'border-gray-200 bg-white text-[#374151] hover:bg-gray-50'
            }`}
          >
            <span className={`flex-shrink-0 w-8 h-8 rounded-md border-2 flex items-center justify-center text-sm font-bold transition-colors ${
              selected ? 'border-[#111827] bg-[#111827] text-white' : 'border-gray-300 text-gray-500 group-hover:border-[#111827]'
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
