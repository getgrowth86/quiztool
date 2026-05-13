'use client';

import { useState, useEffect, useCallback } from 'react';
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
  enter: (dir: number) => ({
    y: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export default function FormPlayer({ form }: Props) {
  const questions = form.questions ?? [];
  const [screen, setScreen] = useState<Screen>(form.welcome_screen ? 'welcome' : 'question');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const currentQuestion: Question | undefined = questions[qIndex];
  const brandColor = form.brand_color ?? '#111827';

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

  // Auto-redirect countdown
  useEffect(() => {
    const url = form.thank_you_screen?.redirect_url;
    if (screen !== 'thankyou' || !url) return;
    setRedirectCountdown(3);
    const interval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); window.location.href = url; return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, form.thank_you_screen?.redirect_url]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setError('');
  };

  const validateCurrent = (): boolean => {
    if (!currentQuestion) return true;
    if (currentQuestion.required) {
      const val = answers[currentQuestion.id] ?? '';
      if (!val.trim()) {
        setError('Diese Frage muss beantwortet werden.');
        return false;
      }
      if (currentQuestion.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.');
        return false;
      }
    }
    return true;
  };

  const advance = useCallback(async () => {
    if (!validateCurrent()) return;
    setError('');

    // Track each answer step with Meta Pixel
    if (form.meta_pixel_id && currentQuestion) {
      const answerValue = answers[currentQuestion.id] ?? '';
      (window as any).fbq?.('trackCustom', 'QuizStep', {
        step: qIndex + 1,
        total_steps: questions.length,
        question: currentQuestion.title,
        answer: answerValue,
      });
    }

    if (qIndex < questions.length - 1) {
      setDirection(1);
      setQIndex(i => i + 1);
    } else {
      // Submit
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
        setSubmitted(true);
        setDirection(1);
        setScreen('thankyou');
      } catch {
        setError('Fehler beim Absenden. Bitte versuche es erneut.');
      } finally {
        setSubmitting(false);
      }
    }
  }, [qIndex, questions.length, answers, form.id, validateCurrent]);

  const goBack = useCallback(() => {
    if (screen === 'question' && qIndex === 0) {
      if (form.welcome_screen) {
        setDirection(-1);
        setScreen('welcome');
      }
      return;
    }
    if (screen === 'question') {
      setDirection(-1);
      setQIndex(i => i - 1);
      setError('');
    }
  }, [screen, qIndex, form.welcome_screen]);

  // Global keyboard: Enter=advance, Escape=back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen === 'welcome') {
        if (e.key === 'Enter') { setDirection(1); setScreen('question'); }
        return;
      }
      if (screen === 'thankyou') return;
      if (e.key === 'Escape') { goBack(); return; }
      // Enter to advance (except for inputs that handle it themselves)
      if (e.key === 'Enter' && currentQuestion) {
        const type = currentQuestion.type;
        if (type === 'long_text') return; // handled by Cmd+Enter
        if (type === 'single_choice' || type === 'rating' || type === 'yes_no') return; // handled by click
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, currentQuestion, advance, goBack]);

  const progress = screen === 'welcome' ? 0
    : screen === 'thankyou' ? 100
    : Math.round(((qIndex + 1) / questions.length) * 100);

  const welcome = form.welcome_screen ?? {
    title: form.title,
    description: form.description ?? '',
    button_text: 'Starten',
  };
  const thankyou = form.thank_you_screen ?? {
    title: 'Vielen Dank!',
    description: 'Deine Antwort wurde gespeichert.',
  };

  // suppress unused warning
  void submitted;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
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

      {/* Navigation arrows */}
      {screen === 'question' && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-40">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-lg bg-white border border-[#374151] shadow-sm hover:bg-gray-50 flex items-center justify-center transition-colors text-[#111827]"
            title="Zurück (Esc)"
          >
            ↑
          </button>
          <button
            onClick={advance}
            disabled={submitting}
            className="w-10 h-10 rounded-lg border shadow-sm flex items-center justify-center transition-colors disabled:opacity-50 text-white"
            style={{ backgroundColor: brandColor, borderColor: brandColor }}
            title="Weiter (Enter)"
          >
            {submitting ? (
              <span className="text-xs animate-spin">◌</span>
            ) : (
              '↓'
            )}
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Welcome screen */}
          {screen === 'welcome' && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl w-full"
            >
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-10 object-contain mb-6" />
              )}
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-[#111827]">{welcome.title}</h1>
              {welcome.description && (
                <p className="text-xl text-[#6B7280] mb-10 leading-relaxed">{welcome.description}</p>
              )}
              <button
                onClick={() => { setDirection(1); setScreen('question'); }}
                className="group flex items-center gap-3 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                {welcome.button_text}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Subtext unter dem Button */}
              {welcome.subtext && (
                <p className="text-sm text-[#6B7280] mt-3">{welcome.subtext}</p>
              )}

              {/* Trust-Texte */}
              {welcome.trust_items && welcome.trust_items.length > 0 && (
                <ul className="mt-5 flex flex-col gap-2">
                  {welcome.trust_items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#374151]">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-sm text-gray-400 mt-4">Drücke <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-600">Enter ↵</kbd> zum Starten</p>
            </motion.div>
          )}

          {/* Question screen */}
          {screen === 'question' && currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl w-full"
            >
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="h-7 object-contain mb-4" />
              )}
              <div className="mb-2 text-sm text-[#9CA3AF] font-medium">
                {qIndex + 1} → {questions.length}
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-2 leading-snug text-[#111827]">
                {currentQuestion.title}
                {currentQuestion.required && <span className="text-[#DC2626] ml-1">*</span>}
              </h2>
              {currentQuestion.description && (
                <p className="text-[#6B7280] mb-8 text-lg">{currentQuestion.description}</p>
              )}

              <div className="mb-8">
                {currentQuestion.type === 'short_text' && (
                  <ShortText
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'long_text' && (
                  <LongText
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'single_choice' && (
                  <SingleChoice
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                    options={currentQuestion.options ?? []}
                  />
                )}
                {currentQuestion.type === 'multiple_choice' && (
                  <MultipleChoice
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    options={currentQuestion.options ?? []}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'rating' && (
                  <Rating
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'number' && (
                  <NumberInput
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'email' && (
                  <EmailInput
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
                {currentQuestion.type === 'yes_no' && (
                  <YesNo
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={v => setAnswer(currentQuestion.id, v)}
                    onSubmit={advance}
                  />
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#DC2626] text-sm mb-4"
                >
                  {error}
                </motion.p>
              )}

              {/* For types that need an explicit OK button */}
              {(currentQuestion.type === 'short_text' || currentQuestion.type === 'long_text' || currentQuestion.type === 'number' || currentQuestion.type === 'email' || currentQuestion.type === 'multiple_choice') && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={advance}
                    disabled={submitting}
                    className="flex items-center gap-2 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: brandColor }}
                  >
                    {qIndex === questions.length - 1 ? 'Absenden' : 'OK'}
                    <span className="text-sm opacity-70">↵</span>
                  </button>
                  {currentQuestion.type !== 'long_text' && (
                    <span className="text-sm text-gray-500">drücke <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-600">Enter ↵</kbd></span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Thank you screen */}
          {screen === 'thankyou' && (
            <motion.div
              key="thankyou"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center mb-6"
              >
                <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: brandColor }}>
                  <svg className="w-10 h-10" style={{ color: brandColor }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#111827]">{thankyou.title}</h1>
              <p className="text-xl text-[#6B7280]">{thankyou.description}</p>
              {thankyou.redirect_url && redirectCountdown !== null && (
                <p className="mt-8 text-sm text-[#9CA3AF]">
                  Weiterleitung in <span className="font-semibold text-[#374151]">{redirectCountdown}</span> Sekunden…
                  <a href={thankyou.redirect_url} className="ml-2 underline" style={{ color: brandColor }}>Jetzt weiterleiten →</a>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Branding footer */}
      <div className="py-4 text-center text-xs text-[#D1D5DB]">
        Bereitgestellt von <span className="text-[#D1D5DB]">Growth-Form</span>
      </div>
    </div>
  );
}
