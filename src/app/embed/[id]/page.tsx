import { getForm } from '@/lib/db';
import FormPlayerEmbed from '@/components/FormPlayerEmbed';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function EmbedFormPage({ params }: Props) {
  const { id } = await params;
  const form = getForm(id);

  if (!form) notFound();
  if (!form.published) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Form not available</h1>
          <p style={{ color: '#9ca3af' }}>This form has not been published yet.</p>
        </div>
      </div>
    );
  }

  return <FormPlayerEmbed form={form} />;
}
