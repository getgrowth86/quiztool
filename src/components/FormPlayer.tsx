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

  const currentQuestion: Question | undefined = questions[qIndex];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col text-white">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div
          className="h-full bg-purple-400"
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
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Zurück (Esc)"
          >
            ↑
          </button>
          <button
            onClick={advance}
            disabled={submitting}
            className="w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors disabled:opacity-50"
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
              <div className="mb-6 text-purple-400 text-5xl">✦</div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">{welcome.title}</h1>
              {welcome.description && (
                <p className="text-xl text-gray-300 mb-10 leading-relaxed">{welcome.description}</p>
              )}
              <button
                onClick={() => { setDirection(1); setScreen('question'); }}
                className="group flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all hover:scale-105"
              >
                {welcome.button_text}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <p className="text-sm text-gray-500 mt-4">Drücke <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Enter ↵</kbd> zum Starten</p>
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
              <div className="mb-2 text-sm text-purple-400 font-medium">
                {qIndex + 1} → {questions.length}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 leading-snug">
                {currentQuestion.title}
                {currentQuestion.required && <span className="text-purple-400 ml-1">*</span>}
              </h2>
              {currentQuestion.description && (
                <p className="text-gray-400 mb-8 text-lg">{currentQuestion.description}</p>
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
                  className="text-red-400 text-sm mb-4"
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
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {qIndex === questions.length - 1 ? 'Absenden' : 'OK'}
                    <span className="text-sm opacity-70">↵</span>
                  </button>
                  {currentQuestion.type !== 'long_text' && (
                    <span className="text-sm text-gray-500">drücke <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Enter ↵</kbd></span>
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
                className="text-7xl mb-6"
              >
                🎉
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">{thankyou.title}</h1>
              <p className="text-xl text-gray-300">{thankyou.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Branding footer */}
      <div className="py-4 text-center text-xs text-gray-600">
        Bereitgestellt von <span className="text-purple-400">FormFlow</span>
      </div>
    </div>
  );
}
