'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export default function EmailInput({ value, onChange, onSubmit }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="email"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
      placeholder="name@example.com"
      className="w-full bg-transparent border-b-2 border-purple-400/50 focus:border-purple-400 outline-none text-2xl md:text-3xl py-3 placeholder:text-gray-400 transition-colors"
    />
  );
}
