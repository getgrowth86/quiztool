import { NextRequest, NextResponse } from 'next/server';
import { getForm, updateForm, deleteForm } from '@/lib/db';
import { z } from 'zod';

const QuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['short_text', 'long_text', 'multiple_choice', 'single_choice', 'rating', 'number', 'email', 'yes_no']),
  title: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  order_index: z.number(),
  options: z.array(z.string()).optional(),
});

const UpdateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  published: z.boolean().optional(),
  welcome_screen: z.object({
    title: z.string(),
    description: z.string(),
    button_text: z.string(),
  }).nullable().optional(),
  thank_you_screen: z.object({
    title: z.string(),
    description: z.string(),
  }).nullable().optional(),
  questions: z.array(QuestionSchema).optional(),
  meta_pixel_id: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  brand_color: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const form = await getForm(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch (err) {
    console.error('GET /api/forms/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const form = await updateForm(id, parsed.data);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch (err) {
    console.error('PUT /api/forms/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ok = await deleteForm(id);
    if (!ok) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/forms/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
