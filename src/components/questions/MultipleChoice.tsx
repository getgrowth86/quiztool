'use client';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onSubmit?: () => void;
}

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function MultipleChoice({ value, onChange, options, onSubmit }: Props) {
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
    <div className="flex flex-col gap-2 w-full">
      {options.map((opt, i) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm group ${
              isSelected
                ? 'border-[#111827] bg-gray-50 text-[#111827]'
                : 'border-gray-200 bg-white text-[#374151] hover:border-gray-400'
            }`}
          >
            <span className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-colors ${
              isSelected
                ? 'border-[#111827] bg-[#111827] text-white'
                : 'border-gray-300 text-gray-500 group-hover:border-gray-400'
            }`}>
              {isSelected ? <CheckIcon /> : KEYS[i]}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
      <p className="hidden md:block text-xs text-gray-500 mt-1">
        Alle zutreffenden auswählen, dann{' '}
        <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-600">Enter ↵</kbd> drücken
      </p>
    </div>
  );
}
