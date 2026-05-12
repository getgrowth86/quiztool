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
        className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#111827] outline-none text-xl md:text-2xl py-3 text-[#111827] placeholder:text-[#9CA3AF] resize-none transition-colors"
      />
      <p className="text-sm text-gray-500 mt-2">Drücke <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-600">Cmd+Enter</kbd> zum Weiter</p>
    </div>
  );
}
