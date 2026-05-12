'use client';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export default function YesNo({ value, onChange, onSubmit }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') { onChange('Yes'); setTimeout(onSubmit, 300); }
      if (e.key === 'n' || e.key === 'N') { onChange('No'); setTimeout(onSubmit, 300); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChange, onSubmit]);

  const labels: Record<string, string> = { Yes: 'Ja', No: 'Nein' };

  return (
    <div className="flex gap-4">
      {['Yes', 'No'].map(opt => {
        const selected = value === opt;
        const isYes = opt === 'Yes';
        return (
          <button
            key={opt}
            onClick={() => { onChange(opt); setTimeout(onSubmit, 300); }}
            className={`flex items-center gap-3 px-8 py-5 rounded-xl border-2 transition-all duration-200 text-xl font-medium ${
              selected
                ? 'border-[#111827] bg-[#111827] text-white'
                : 'border-gray-200 bg-white text-[#374151] hover:border-[#111827]'
            }`}
          >
            <span>{labels[opt]}</span>
            <span className={`text-xs ml-1 ${selected ? 'text-gray-300' : 'text-gray-400'}`}>{isYes ? 'Y' : 'N'}</span>
          </button>
        );
      })}
    </div>
  );
}
