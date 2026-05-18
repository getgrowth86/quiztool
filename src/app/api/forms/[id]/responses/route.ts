import { NextRequest, NextResponse } from 'next/server';
import { getForm, createResponse, listResponses } from '@/lib/db';
import { z } from 'zod';
import { Form } from '@/lib/types';

async function pushToGoogleSheet(form: Form, answers: { question_id: string; value: string }[]) {
  if (!form.google_sheet_webhook_url) return;
  const questions = form.questions ?? [];

  // Build header row and value row
  const headers = ['Zeitstempel', ...questions.map(q => q.title)];
  const values = [
    new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
    ...questions.map(q => answers.find(a => a.question_id === q.id)?.value ?? ''),
  ];

  await fetch(form.google_sheet_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headers, values }),
  });
}

async function pushToClose(form: Form, answers: { question_id: string; value: string }[]) {
  if (!form.close_api_key) return;
  const mapping = form.close_field_mapping ?? {};
  const questions = form.questions ?? [];

  const getVal = (qId?: string) => qId ? (answers.find(a => a.question_id === qId)?.value ?? '') : '';

  const nameVal = getVal(mapping.name_question_id);
  const emailVal = getVal(mapping.email_question_id);
  const phoneVal = getVal(mapping.phone_question_id);

  // Build a note with all answers
  const noteLines = answers.map(a => {
    const q = questions.find(q => q.id === a.question_id);
    return `${q?.title ?? a.question_id}: ${a.value}`;
  });
  const noteText = `Quiz-Antworten (${form.title}):\n\n${noteLines.join('\n')}`;

  const leadName = nameVal || form.title;

  const contact: Record<string, unknown> = { name: nameVal || undefined };
  if (emailVal) contact.emails = [{ email: emailVal, type: 'office' }];
  if (phoneVal) contact.phones = [{ phone: phoneVal, type: 'office' }];

  const leadPayload: Record<string, unknown> = {
    name: leadName,
    contacts: Object.keys(contact).length > 0 ? [contact] : [],
  };

  const auth = Buffer.from(`${form.close_api_key}:`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  // Create lead
  const leadRes = await fetch('https://api.close.com/api/v1/lead/', {
    method: 'POST',
    headers,
    body: JSON.stringify(leadPayload),
  });

  if (!leadRes.ok) {
    const err = await leadRes.text();
    console.error('Close API lead creation failed:', err);
    return;
  }

  const lead = await leadRes.json();

  // Add note with all answers
  await fetch('https://api.close.com/api/v1/activity/note/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ lead_id: lead.id, note: noteText }),
  });
}

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
    const form = await getForm(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    const responses = await listResponses(id);
    return NextResponse.json(responses);
  } catch (err) {
    console.error('GET /api/forms/[id]/responses error:', err);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const form = await getForm(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    if (!form.published) return NextResponse.json({ error: 'Form is not published' }, { status: 403 });

    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const response = await createResponse(id, parsed.data.answers);

    // Push to Google Sheets in background (non-blocking)
    if (form.google_sheet_webhook_url) {
      pushToGoogleSheet(form, parsed.data.answers).catch(err =>
        console.error('Google Sheets push error:', err)
      );
    }

    // Push to Close CRM in background (non-blocking)
    if (form.close_api_key) {
      pushToClose(form, parsed.data.answers).catch(err =>
        console.error('Close CRM push error:', err)
      );
    }

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('POST /api/forms/[id]/responses error:', err);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
