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
            className={`flex items-center gap-3 px-8 py-5 rounded-xl border-2 transition-all duration-200 text-xl font-medium hover:scale-105 ${
              selected
                ? isYes
                  ? 'border-green-500 bg-green-500/20 text-green-300'
                  : 'border-red-500 bg-red-500/20 text-red-300'
                : 'border-white/20 bg-white/5 text-gray-200 hover:border-white/40'
            }`}
          >
            <span className="text-2xl">{isYes ? '👍' : '👎'}</span>
            <span>{labels[opt]}</span>
            <span className="text-xs text-gray-400 ml-1">{isYes ? 'Y' : 'N'}</span>
          </button>
        );
      })}
    </div>
  );
}
