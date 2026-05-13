'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Question, QuestionType } from '@/lib/types';

interface Props {
  form?: Form;
  onSave?: (form: Form) => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'short_text', label: 'Kurztext', icon: '✏️' },
  { value: 'long_text', label: 'Langtext', icon: '📝' },
  { value: 'single_choice', label: 'Einfachauswahl', icon: '◎' },
  { value: 'multiple_choice', label: 'Mehrfachauswahl', icon: '☑️' },
  { value: 'rating', label: 'Bewertung (Sterne)', icon: '⭐' },
  { value: 'number', label: 'Zahl', icon: '🔢' },
  { value: 'email', label: 'E-Mail', icon: '✉️' },
  { value: 'yes_no', label: 'Ja / Nein', icon: '👍' },
];

type EditableQuestion = Omit<Question, 'id' | 'form_id'> & { id?: string; tempId: string };

function generateTempId() {
  return 'tmp_' + Math.random().toString(36).slice(2);
}

export default function FormBuilder({ form, onSave }: Props) {
  const router = useRouter();
  const isEdit = Boolean(form);

  const [title, setTitle] = useState(form?.title ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [welcomeTitle, setWelcomeTitle] = useState(form?.welcome_screen?.title ?? '');
  const [welcomeDesc, setWelcomeDesc] = useState(form?.welcome_screen?.description ?? '');
  const [welcomeBtn, setWelcomeBtn] = useState(form?.welcome_screen?.button_text ?? 'Starten');
  const [tyTitle, setTyTitle] = useState(form?.thank_you_screen?.title ?? 'Vielen Dank!');
  const [tyDesc, setTyDesc] = useState(form?.thank_you_screen?.description ?? 'Deine Antwort wurde gespeichert.');
  const [published, setPublished] = useState(form?.published ?? false);
  const [logoUrl, setLogoUrl] = useState(form?.logo_url ?? '');
  const [brandColor, setBrandColor] = useState(form?.brand_color ?? '#111827');
  const [metaPixelId, setMetaPixelId] = useState(form?.meta_pixel_id ?? '');
  const [welcomeEnabled, setWelcomeEnabled] = useState(Boolean(form?.welcome_screen));
  const [welcomeSubtext, setWelcomeSubtext] = useState(form?.welcome_screen?.subtext ?? '');
  const [welcomeTrustItems, setWelcomeTrustItems] = useState<string[]>(form?.welcome_screen?.trust_items ?? []);

  const [questions, setQuestions] = useState<EditableQuestion[]>(
    (form?.questions ?? []).map(q => ({ ...q, tempId: q.id }))
  );

  const [activeQIndex, setActiveQIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');

  const addQuestion = () => {
    const newQ: EditableQuestion = {
      tempId: generateTempId(),
      type: 'short_text',
      title: 'Unbenannte Frage',
      description: '',
      required: false,
      order_index: questions.length,
      options: null,
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQIndex(questions.length);
  };

  const updateQuestion = (idx: number, patch: Partial<EditableQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order_index: i })));
    setActiveQIndex(null);
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((q, i) => ({ ...q, order_index: i }));
    });
    setActiveQIndex(target);
  };

  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    const opts = q.options ?? [];
    updateQuestion(qIdx, { options: [...opts, `Option ${opts.length + 1}`] });
  };

  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const opts = [...(questions[qIdx].options ?? [])];
    opts[oIdx] = val;
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const opts = (questions[qIdx].options ?? []).filter((_, i) => i !== oIdx);
    updateQuestion(qIdx, { options: opts });
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Formulartitel ist erforderlich'); return; }
    const badOptions = questions.find(q => (q.type === 'single_choice' || q.type === 'multiple_choice') && (q.options ?? []).length < 2);
    if (badOptions) { setError(`Frage "${badOptions.title}" benötigt mindestens 2 Optionen.`); return; }
    setSaving(true);
    setError('');

    const payload = {
      title,
      description,
      published,
      welcome_screen: (welcomeEnabled && welcomeTitle) ? {
        title: welcomeTitle,
        description: welcomeDesc,
        button_text: welcomeBtn,
        subtext: welcomeSubtext || undefined,
        trust_items: welcomeTrustItems.filter(t => t.trim()).length > 0 ? welcomeTrustItems.filter(t => t.trim()) : undefined,
      } : null,
      thank_you_screen: { title: tyTitle, description: tyDesc },
      logo_url: logoUrl || null,
      brand_color: brandColor || null,
      meta_pixel_id: metaPixelId || null,
      questions: questions.map((q, i) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        order_index: i,
        options: q.options,
      })),
    };

    try {
      const res = isEdit
        ? await fetch(`/api/forms/${form!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) throw new Error('Save failed');
      const saved: Form = await res.json();

      // If we just created, update form with questions
      if (!isEdit) {
        const updateRes = await fetch(`/api/forms/${saved.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: payload.questions }),
        });
        if (updateRes.ok) {
          onSave?.(await updateRes.json());
        }
        router.push(`/forms/${saved.id}/edit`);
        return;
      }

      onSave?.(saved);
    } catch {
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = form ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${form.id}` : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 transition-colors text-xl">←</button>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Unbenanntes Formular"
            className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none min-w-[200px] placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-3">
          {form && (
            <a
              href={`/f/${form.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:text-purple-700 underline"
            >
              Preview ↗
            </a>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <div
              onClick={() => setPublished(p => !p)}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${published ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${published ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            {published ? 'Veröffentlicht' : 'Entwurf'}
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="flex border-b border-gray-200">
            {(['questions', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'questions' ? 'Fragen' : 'Einstellungen'}
              </button>
            ))}
          </div>

          {activeTab === 'questions' && (
            <div className="flex flex-col gap-1 p-3 flex-1">
              {questions.map((q, i) => (
                <button
                  key={q.tempId}
                  onClick={() => setActiveQIndex(i)}
                  className={`text-left px-3 py-2.5 rounded-lg transition-colors group ${activeQIndex === i ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm truncate flex-1">{q.title || 'Unbenannt'}</span>
                    <span className="text-xs text-gray-400">{QUESTION_TYPES.find(t => t.value === q.type)?.icon}</span>
                  </div>
                </button>
              ))}
              <button
                onClick={addQuestion}
                className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 text-sm text-gray-400 hover:text-purple-600 transition-colors"
              >
                <span className="text-lg">+</span>
                Frage hinzufügen
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Willkommensseite</h3>
                  <div
                    onClick={() => setWelcomeEnabled(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${welcomeEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${welcomeEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                {welcomeEnabled && (
                  <div className="flex flex-col gap-2">
                    <input value={welcomeTitle} onChange={e => setWelcomeTitle(e.target.value)} placeholder="Begrüßungstitel" className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400" />
                    <textarea value={welcomeDesc} onChange={e => setWelcomeDesc(e.target.value)} placeholder="Begrüßungstext" rows={2} className="border rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-gray-400" />
                    <input value={welcomeBtn} onChange={e => setWelcomeBtn(e.target.value)} placeholder="Schaltflächentext" className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400" />
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Text unter Button</label>
                      <input
                        value={welcomeSubtext}
                        onChange={e => setWelcomeSubtext(e.target.value)}
                        placeholder="z.B. Aktuell werden neue Bewerber geprüft"
                        className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Trust-Texte (mit Häkchen)</label>
                      <div className="flex flex-col gap-1.5">
                        {welcomeTrustItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={item}
                              onChange={e => {
                                const next = [...welcomeTrustItems];
                                next[i] = e.target.value;
                                setWelcomeTrustItems(next);
                              }}
                              placeholder={`Trust-Text ${i + 1}`}
                              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <button
                              onClick={() => setWelcomeTrustItems(welcomeTrustItems.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                            >×</button>
                          </div>
                        ))}
                        <button
                          onClick={() => setWelcomeTrustItems([...welcomeTrustItems, ''])}
                          className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 mt-0.5"
                        >
                          <span className="text-base">+</span> Trust-Text hinzufügen
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dankesseite</h3>
                <div className="flex flex-col gap-2">
                  <input value={tyTitle} onChange={e => setTyTitle(e.target.value)} placeholder="Dankestitel" className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  <textarea value={tyDesc} onChange={e => setTyDesc(e.target.value)} placeholder="Dankestext" rows={2} className="border rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Branding & Tracking</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Logo-URL</label>
                    <input
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Direkte URL zu deinem Logo (PNG, SVG)</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Brandfarbe</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={e => setBrandColor(e.target.value)}
                        className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
                      />
                      <input
                        value={brandColor}
                        onChange={e => setBrandColor(e.target.value)}
                        placeholder="#111827"
                        className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Meta Pixel ID</label>
                    <input
                      value={metaPixelId}
                      onChange={e => setMetaPixelId(e.target.value)}
                      placeholder="123456789012345"
                      className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Deine Facebook/Meta Pixel ID für Conversion-Tracking</p>
                  </div>
                </div>
              </div>
              {form && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Link teilen</h3>
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl} className="border rounded-lg px-3 py-2 text-xs w-full bg-gray-50 text-gray-600" />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700"
                    >
                      Kopieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main editor area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeQIndex === null && (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-64 text-gray-400">
              <span className="text-5xl mb-4">📋</span>
              <p className="text-lg">Wähle eine Frage zum Bearbeiten oder füge eine neue hinzu</p>
            </div>
          )}

          {activeQIndex !== null && questions[activeQIndex] && (() => {
            const q = questions[activeQIndex];
            const needsOptions = q.type === 'single_choice' || q.type === 'multiple_choice';
            return (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveQuestion(activeQIndex, -1)} disabled={activeQIndex === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500" title="Move up">↑</button>
                      <button onClick={() => moveQuestion(activeQIndex, 1)} disabled={activeQIndex === questions.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500" title="Move down">↓</button>
                    </div>
                    <button onClick={() => removeQuestion(activeQIndex)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Delete question">
                      🗑
                    </button>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Fragetyp</label>
                    <select
                      value={q.type}
                      onChange={e => {
                        const t = e.target.value as QuestionType;
                        updateQuestion(activeQIndex, {
                          type: t,
                          options: (t === 'single_choice' || t === 'multiple_choice') ? (q.options && q.options.length ? q.options : ['Option 1', 'Option 2']) : null
                        });
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Fragetitel</label>
                    <input
                      value={q.title}
                      onChange={e => updateQuestion(activeQIndex, { title: e.target.value })}
                      placeholder="Deine Frage eingeben..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Beschreibung (optional)</label>
                    <input
                      value={q.description ?? ''}
                      onChange={e => updateQuestion(activeQIndex, { description: e.target.value })}
                      placeholder="Beschreibung oder Hinweis hinzufügen..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>

                  <div className="mb-5 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={e => updateQuestion(activeQIndex, { required: e.target.checked })}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm text-gray-700">Pflichtfeld</span>
                    </label>
                  </div>

                  {needsOptions && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Antwortoptionen</label>
                      <div className="flex flex-col gap-2">
                        {(q.options ?? []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-6 text-center">{String.fromCharCode(65 + oIdx)}</span>
                            <input
                              value={opt}
                              onChange={e => updateOption(activeQIndex, oIdx, e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <button onClick={() => removeOption(activeQIndex, oIdx)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                          </div>
                        ))}
                        <button onClick={() => addOption(activeQIndex)} className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 mt-1">
                          <span className="text-lg">+</span> Option hinzufügen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
