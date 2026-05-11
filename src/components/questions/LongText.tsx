'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export default function LongText({ value, onChange, onSubmit }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Antwort hier eingeben..."
        rows={4}
        className="w-full bg-transparent border-b-2 border-purple-400/50 focus:border-purple-400 outline-none text-xl md:text-2xl py-3 placeholder:text-gray-400 resize-none transition-colors"
      />
      <p className="text-sm text-gray-400 mt-2">Drücke <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Cmd+Enter</kbd> zum Weiter</p>
    </div>
  );
}
