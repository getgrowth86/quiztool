'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Form, Question } from '@/lib/types';
import ShortText from './questions/ShortText';
import LongText from './questions/LongText';
import SingleChoice from './questions/SingleChoice';
import MultipleChoice from './questions/MultipleChoice';
import Rating from './questions/Rating';
import NumberInput from './questions/NumberInput';
import EmailInput from './questions/EmailInput';
import YesNo from './questions/YesNo';

interface Props {
  form: Form;
}

type Screen = 'welcome' | 'question' | 'thankyou';

const slideVariants = {
  enter: (dir: number) => ({ y: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function FormPlayerEmbed({ form }: Props) {
  const questions = form.questions ?? [];
  const [screen, setScreen] = useState<Screen>(form.welcome_screen ? 'welcome' : 'question');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentQuestion: Question | undefined = questions[qIndex];
  const brandColor = form.brand_color ?? '#111827';

  // Reset body/html styles for clean iframe embedding
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
  }, []);

  // Inject Meta Pixel on mount
  useEffect(() => {
    if (!form.meta_pixel_id) return;
    const pixelId = form.meta_pixel_id;
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
  }, [form.meta_pixel_id]);

  // Fire Lead event when thank-you screen appears
  useEffect(() => {
    if (screen === 'thankyou' && form.meta_pixel_id) {
      (window as any).fbq?.('track', 'Lead');
    }
  }, [screen, form.meta_pixel_id]);

  // postMessage height to parent for auto-resize
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'formflow:resize', height }, '*');
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [screen, qIndex, error]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setError('');
  };

  const validateCurrent = (): boolean => {
    if (!currentQuestion) return true;
    if (currentQuestion.required) {
      const val = answers[currentQuestion.id] ?? '';
      if (!val.trim()) { setError('Diese Frage muss beantwortet werden.'); return false; }
      if (currentQuestion.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.'); return false;
      }
    }
    return true;
  };

  const advance = useCallback(async () => {
    if (!validateCurrent()) return;
    setError('');
    if (qIndex < questions.length - 1) {
      setDirection(1);
      setQIndex(i => i + 1);
    } else {
      setSubmitting(true);
      try {
        const payload = {
          answers: Object.entries(answers).map(([question_id, value]) => ({ question_id, value })),
        };
        const res = await fetch(`/api/forms/${form.id}/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Fehler beim Absenden');
        setDirection(1);
        setScreen('thankyou');
        // Notify parent that form was completed
        window.parent.postMessage({ type: 'formflow:complete', formId: form.id }, '*');
      } catch {
        setError('Fehler beim Absenden. Bitte versuche es erneut.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [qIndex, questions.length, answers, form.id]);

  const goBack = useCallback(() => {
    if (screen === 'question' && qIndex === 0) {
      if (form.welcome_screen) { setDirection(-1); setScreen('welcome'); }
      return;
    }
    if (screen === 'question') { setDirection(-1); setQIndex(i => i - 1); setError(''); }
  }, [screen, qIndex, form.welcome_screen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen === 'welcome') { if (e.key === 'Enter') { setDirection(1); setScreen('question'); } return; }
      if (screen === 'thankyou') return;
      if (e.key === 'Escape') { goBack(); return; }
      if (e.key === 'Enter' && currentQuestion) {
        const type = currentQuestion.type;
        if (type === 'long_text' || type === 'single_choice' || type === 'rating' || type === 'yes_no') return;
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, currentQuestion, advance, goBack]);

  const progress = screen === 'welcome' ? 0 : screen === 'thankyou' ? 100 : Math.round(((qIndex + 1) / questions.length) * 100);
  const welcome = form.welcome_screen ?? { title: form.title, description: form.description ?? '', button_text: 'Starten' };
  const thankyou = form.thank_you_screen ?? { title: 'Vielen Dank!', description: 'Deine Antwort wurde gespeichert.' };

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col bg-[#F9FAFB]"
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#E5E7EB] z-50">
        <motion.div
          className="h-full"
          style={{ backgroundColor: brandColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      {/* Back/forward arrows */}
      {screen === 'question' && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-lg bg-white border border-[#374151] shadow-sm hover:bg-gray-50 flex items-center justify-center transition-colors text-sm text-[#111827]"
            title="Zurück (Esc)"
          >↑</button>
          <button
            onClick={advance}
            disabled={submitting}
            className="w-9 h-9 rounded-lg border shadow-sm flex items-center justify-center transition-colors disabled:opacity-50 text-sm text-white"
            style={{ backgroundColor: brandColor, borderColor: brandColor }}
            title="Weiter (Enter)"
          >
            {submitting ? <span className="animate-spin text-xs">◌</span> : '↓'}
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-12">
        <AnimatePresence mode="wait" custom={direction}>

          {screen === 'welcome' && (
            <motion.div key="welcome" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-xl w-full"
            >
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-10 object-contain mb-6" />
              )}
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5 text-[#111827]">{welcome.title}</h1>
              {welcome.description && (
                <p className="text-lg text-[#6B7280] mb-8 leading-relaxed">{welcome.description}</p>
              )}
              <button
                onClick={() => { setDirection(1); setScreen('question'); }}
                className="group flex items-center gap-3 text-white px-7 py-3.5 rounded-lg text-base font-medium transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                {welcome.button_text}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Drücke <kbd className="bg-gray-100 border border-gray-300 px-1 py-0.5 rounded text-xs text-gray-600">Enter ↵</kbd> zum Starten
              </p>
            </motion.div>
          )}

          {screen === 'question' && currentQuestion && (
            <motion.div key={currentQuestion.id} custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-xl w-full"
            >
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-7 object-contain mb-4" />
              )}
              <div className="mb-2 text-xs text-[#9CA3AF] font-medium">
                {qIndex + 1} → {questions.length}
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2 leading-snug text-[#111827]">
                {currentQuestion.title}
                {currentQuestion.required && <span className="text-[#DC2626] ml-1">*</span>}
              </h2>
              {currentQuestion.description && (
                <p className="text-[#6B7280] mb-6 text-base">{currentQuestion.description}</p>
              )}

              <div className="mb-6">
                {currentQuestion.type === 'short_text' && <ShortText value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
                {currentQuestion.type === 'long_text' && <LongText value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
                {currentQuestion.type === 'single_choice' && <SingleChoice value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} options={currentQuestion.options ?? []} />}
                {currentQuestion.type === 'multiple_choice' && <MultipleChoice value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} options={currentQuestion.options ?? []} onSubmit={advance} />}
                {currentQuestion.type === 'rating' && <Rating value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
                {currentQuestion.type === 'number' && <NumberInput value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
                {currentQuestion.type === 'email' && <EmailInput value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
                {currentQuestion.type === 'yes_no' && <YesNo value={answers[currentQuestion.id] ?? ''} onChange={v => setAnswer(currentQuestion.id, v)} onSubmit={advance} />}
              </div>

              {error && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-[#DC2626] text-sm mb-4">
                  {error}
                </motion.p>
              )}

              {(['short_text', 'long_text', 'number', 'email', 'multiple_choice'] as const).includes(currentQuestion.type as never) && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={advance}
                    disabled={submitting}
                    className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    {qIndex === questions.length - 1 ? 'Absenden' : 'OK'}
                    <span className="text-xs opacity-70">↵</span>
                  </button>
                  {currentQuestion.type !== 'long_text' && (
                    <span className="text-xs text-gray-500">
                      oder <kbd className="bg-gray-100 border border-gray-300 px-1 py-0.5 rounded text-xs text-gray-600">Enter ↵</kbd>
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {screen === 'thankyou' && (
            <motion.div key="thankyou" custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-xl w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center mb-6"
              >
                <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: brandColor }}>
                  <svg className="w-8 h-8" style={{ color: brandColor }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 text-[#111827]">{thankyou.title}</h1>
              <p className="text-lg text-[#6B7280]">{thankyou.description}</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="py-3 text-center text-xs text-[#D1D5DB]">
        Bereitgestellt von <span className="text-[#D1D5DB]">FormFlow</span>
      </div>
    </div>
  );
}
