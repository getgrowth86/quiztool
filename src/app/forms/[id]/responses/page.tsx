import Link from 'next/link';
import { getForm, listResponses } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Question, Response, Answer } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

function formatValue(question: Question, value: string): string {
  if (!value) return '—';
  if (question.type === 'multiple_choice') {
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.join(', ') : value;
    } catch {
      return value;
    }
  }
  if (question.type === 'rating') {
    return '★'.repeat(parseInt(value)) + '☆'.repeat(5 - parseInt(value));
  }
  return value;
}

export default async function ResponsesPage({ params }: Props) {
  const { id } = await params;
  const form = getForm(id);
  if (!form) notFound();

  const responses: Response[] = listResponses(id);
  const questions = form.questions ?? [];

  const total = responses.length;
  // "completed" = answered at least half the required questions
  const requiredQs = questions.filter(q => q.required);
  const completed = responses.filter(r => {
    if (requiredQs.length === 0) return true;
    const answered = (r.answers ?? []).filter(a => requiredQs.some(q => q.id === a.question_id) && a.value?.trim()).length;
    return answered >= requiredQs.length;
  }).length;

  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors text-xl">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">{form.title}</h1>
            <p className="text-xs text-gray-500">Antworten</p>
          </div>
          <Link href={`/forms/${id}/edit`} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            Formular bearbeiten
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Antworten gesamt', value: total, color: 'text-gray-900' },
            { label: 'Abgeschlossen', value: completed, color: 'text-green-600' },
            { label: 'Abschlussrate', value: `${completionRate}%`, color: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {responses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Noch keine Antworten</h2>
            <p className="text-gray-500 mb-6">Teile dein Formular, um Antworten zu sammeln.</p>
            {form.published && (
              <a
                href={`/f/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700"
              >
                View Form ↗
              </a>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Abgeschickt
                    </th>
                    {questions.map(q => (
                      <th key={q.id} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide max-w-48">
                        <span className="truncate block" title={q.title}>{q.title}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => {
                    const answerMap: Record<string, string> = {};
                    for (const a of (r.answers ?? []) as Answer[]) {
                      answerMap[a.question_id] = a.value;
                    }
                    return (
                      <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('de-DE', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        {questions.map(q => (
                          <td key={q.id} className="px-4 py-3 text-gray-700 max-w-48">
                            <span className="truncate block" title={answerMap[q.id] ?? ''}>
                              {formatValue(q, answerMap[q.id] ?? '')}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
