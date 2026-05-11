import { NextRequest, NextResponse } from 'next/server';
import { getForm, createResponse, listResponses } from '@/lib/db';
import { z } from 'zod';

const SubmitSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string(),
    value: z.string(),
  })),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const form = getForm(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    const responses = listResponses(id);
    return NextResponse.json(responses);
  } catch (err) {
    console.error('GET /api/forms/[id]/responses error:', err);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const form = getForm(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    if (!form.published) return NextResponse.json({ error: 'Form is not published' }, { status: 403 });

    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const response = createResponse(id, parsed.data.answers);
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('POST /api/forms/[id]/responses error:', err);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
