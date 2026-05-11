import { getForm } from '@/lib/db';
import FormPlayer from '@/components/FormPlayer';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PublicFormPage({ params }: Props) {
  const { id } = await params;
  const form = await getForm(id);

  if (!form) notFound();
  if (!form.published) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center text-white text-center px-6">
        <div>
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold mb-3">Dieses Formular ist nicht verfügbar</h1>
          <p className="text-gray-400">Das Formular wurde noch nicht veröffentlicht.</p>
        </div>
      </div>
    );
  }

  return <FormPlayer form={form} />;
}
