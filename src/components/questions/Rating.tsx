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
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= (hovered || rating);
          return (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => { onChange(String(star)); setTimeout(onSubmit, 300); }}
              className="text-5xl md:text-6xl transition-all duration-150 hover:scale-110 focus:outline-none"
              aria-label={`${star} Sterne`}
            >
              <span className={filled ? 'text-yellow-400' : 'text-gray-600'}>★</span>
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <p className="text-gray-300 text-lg">
          {rating === 1 && 'Sehr schlecht'}
          {rating === 2 && 'Schlecht'}
          {rating === 3 && 'Ok'}
          {rating === 4 && 'Gut'}
          {rating === 5 && 'Ausgezeichnet!'}
        </p>
      )}
      <p className="text-sm text-gray-400">Drücke <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">1–5</kbd> auf der Tastatur</p>
    </div>
  );
}
