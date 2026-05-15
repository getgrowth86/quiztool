'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  options: string[];
}

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function SingleChoice({ value, onChange, onSubmit, options }: Props) {
  // Auto-advance when value changes (fixes stale-closure issue with setTimeout)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value && value !== prevValueRef.current) {
      prevValueRef.current = value;
      const timer = setTimeout(onSubmit, 280);
      return () => clearTimeout(timer);
    }
  }, [value, onSubmit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = KEYS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < options.length) {
        onChange(options[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [options, onChange]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex items-center gap-2.5 text-left px-3 py-2 rounded-lg border transition-all duration-150 text-sm group hover:border-[#111827] ${
              selected
                ? 'border-[#111827] bg-[#111827]/5 text-[#111827]'
                : 'border-gray-200 bg-white text-[#374151] hover:bg-gray-50'
            }`}
          >
            <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors ${
              selected ? 'border-[#111827] bg-[#111827] text-white' : 'border-gray-300 text-gray-400 group-hover:border-[#111827]'
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
