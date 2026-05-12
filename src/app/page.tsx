import Link from 'next/link';
import { listForms } from '@/lib/db';
import { Form } from '@/lib/types';
import EmbedButton from '@/components/EmbedButton';

export const dynamic = 'force-dynamic';

function FormCard({ form }: { form: Form }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg truncate">{form.title}</h3>
          {form.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{form.description}</p>
          )}
        </div>
        <span className={`ml-3 flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${form.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {form.published ? 'Veröffentlicht' : 'Entwurf'}
        </span>
      </div>
      <div className="text-xs text-gray-400 mb-5">
        Aktualisiert {new Date(form.updated_at).toLocaleDateString('de-DE', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/forms/${form.id}/edit`}
          className="flex-1 text-center text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Bearbeiten
        </Link>
        <Link
          href={`/forms/${form.id}/responses`}
          className="flex-1 text-center text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Antworten
        </Link>
        {form.published && (
          <>
            <a
              href={`/f/${form.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Open ↗
            </a>
            <EmbedButton formId={form.id} />
          </>
        )}
      </div>
    </div>
  );
}

export default async function Home() {
  const forms: Form[] = await listForms();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111827] rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="text-xl font-bold text-[#111827]">FormFlow</span>
          </div>
          <Link
            href="/forms/new"
            className="flex items-center gap-2 bg-[#111827] hover:bg-[#1F2937] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Neues Formular
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-xl border-2 border-gray-200 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4.5 7.5A2.5 2.5 0 017 5h10a2.5 2.5 0 012.5 2.5v9A2.5 2.5 0 0117 19H7a2.5 2.5 0 01-2.5-2.5v-9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Noch keine Formulare</h2>
            <p className="text-gray-500 mb-8 max-w-sm">Erstelle dein erstes Formular und sammle dialogorientierte Antworten.</p>
            <Link
              href="/forms/new"
              className="flex items-center gap-2 bg-[#111827] hover:bg-[#1F2937] text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
            >
              <span className="text-xl leading-none">+</span>
              Erstes Formular erstellen
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Deine Formulare</h1>
                <p className="text-gray-500 text-sm mt-1">{forms.length} {forms.length !== 1 ? 'Formulare' : 'Formular'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {forms.map(form => (
                <FormCard key={form.id} form={form} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
