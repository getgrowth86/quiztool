import { NextRequest, NextResponse } from 'next/server';
import { listForms, createForm } from '@/lib/db';
import { z } from 'zod';

const CreateFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  welcome_screen: z.object({
    title: z.string(),
    description: z.string(),
    button_text: z.string(),
  }).optional(),
  thank_you_screen: z.object({
    title: z.string(),
    description: z.string(),
  }).optional(),
});

export async function GET() {
  try {
    const forms = listForms();
    return NextResponse.json(forms);
  } catch (err) {
    console.error('GET /api/forms error:', err);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const form = createForm(parsed.data);
    return NextResponse.json(form, { status: 201 });
  } catch (err) {
    console.error('POST /api/forms error:', err);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
