import { getForm } from '@/lib/db';
import FormBuilder from '@/components/FormBuilder';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function EditFormPage({ params }: Props) {
  const { id } = await params;
  const form = getForm(id);
  if (!form) notFound();
  return <FormBuilder form={form} />;
}
