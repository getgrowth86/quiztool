'use client';
import { useState, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export default function Rating({ value, onChange, onSubmit }: Props) {
  const [hovered, setHovered] = useState(0);
  const rating = value ? parseInt(value) : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= 5) {
        onChange(String(n));
        setTimeout(onSubmit, 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChange, onSubmit]);

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= (hovered || rating);
          return (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => { onChange(String(star)); setTimeout(onSubmit, 300); }}
              className="text-3xl md:text-4xl transition-colors duration-150 focus:outline-none"
              aria-label={`${star} Sterne`}
            >
              <span className={filled ? 'text-[#111827]' : 'text-[#D1D5DB]'}>★</span>
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <p className="text-gray-600 text-sm">
          {rating === 1 && 'Sehr schlecht'}
          {rating === 2 && 'Schlecht'}
          {rating === 3 && 'Ok'}
          {rating === 4 && 'Gut'}
          {rating === 5 && 'Ausgezeichnet!'}
        </p>
      )}
      <p className="hidden md:block text-xs text-gray-500">Drücke <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-600">1–5</kbd> auf der Tastatur</p>
    </div>
  );
}
