'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export default function ShortText({ value, onChange, onSubmit, placeholder = 'Antwort hier eingeben...' }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
      placeholder={placeholder}
      className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#111827] outline-none text-2xl md:text-3xl py-3 text-[#111827] placeholder:text-[#9CA3AF] transition-colors"
    />
  );
}
