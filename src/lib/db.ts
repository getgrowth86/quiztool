import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.quiztool_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!connectionString) throw new Error('No database connection string found. Set quiztool_DATABASE_URL.');

const sql = neon(connectionString, { fullResults: true });
import { Form, Question, Response, Answer } from './types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function ensureInit() {
  await sql`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      welcome_screen TEXT,
      thank_you_screen TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      required BOOLEAN NOT NULL DEFAULT FALSE,
      order_index INTEGER NOT NULL DEFAULT 0,
      options TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      value TEXT NOT NULL
    )
  `;

  await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT`;
  await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS logo_url TEXT`;
  await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS brand_color TEXT`;

  // Seed example form if none exists
  const { rows } = await sql`SELECT COUNT(*) AS c FROM forms`;
  if (parseInt(rows[0].c) === 0) {
    await seedExampleForm();
  }
}

async function seedExampleForm() {
  const now = new Date().toISOString();
  const formId = generateId();

  await sql`
    INSERT INTO forms (id, title, description, welcome_screen, thank_you_screen, published, created_at, updated_at)
    VALUES (
      ${formId},
      'Kundenzufriedenheits-Umfrage',
      'Hilf uns zu verbessern, indem du deine Erfahrungen teilst',
      ${JSON.stringify({ title: 'Wir freuen uns über dein Feedback! 💜', description: 'Diese kurze Umfrage dauert weniger als 2 Minuten. Deine Antworten helfen uns, bessere Produkte zu entwickeln.', button_text: 'Umfrage starten' })},
      ${JSON.stringify({ title: 'Vielen Dank! 🎉', description: 'Dein Feedback bedeutet uns sehr viel. Wir werden es nutzen, um uns weiter zu verbessern.' })},
      TRUE,
      ${now},
      ${now}
    )
  `;

  const questions = [
    { type: 'short_text', title: 'Wie heißt du?', description: 'Wir würden gerne wissen, mit wem wir sprechen.', required: true, options: null },
    { type: 'email', title: 'Wie lautet deine E-Mail-Adresse?', description: 'Wir verwenden sie nur, um bei Bedarf nachzufragen.', required: true, options: null },
    { type: 'rating', title: 'Wie bewertest du deine Gesamterfahrung?', description: null, required: true, options: null },
    { type: 'single_choice', title: 'Welche Funktion nutzt du am meisten?', description: 'Wähle die Funktion, auf die du am häufigsten angewiesen bist.', required: true, options: JSON.stringify(['Formular-Builder', 'Antworten-Analyse', 'Teilen & Einbetten', 'Integrationen']) },
    { type: 'multiple_choice', title: 'Was würdest du gerne verbessert sehen?', description: 'Wähle alles Zutreffende aus.', required: false, options: JSON.stringify(['Schnellere Leistung', 'Mehr Fragetypen', 'Bessere Analysen', 'Mobile App', 'Integrationen', 'Design-Optionen']) },
    { type: 'yes_no', title: 'Würdest du uns einem Freund empfehlen?', description: null, required: true, options: null },
    { type: 'long_text', title: 'Weitere Gedanken oder Vorschläge?', description: 'Teile gerne alles mit, was dir auf dem Herzen liegt.', required: false, options: null },
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await sql`
      INSERT INTO questions (id, form_id, type, title, description, required, order_index, options)
      VALUES (${generateId()}, ${formId}, ${q.type}, ${q.title}, ${q.description}, ${q.required}, ${i}, ${q.options})
    `;
  }
}

// ── Forms ──────────────────────────────────────────────────────────────────

export async function listForms(): Promise<Form[]> {
  await ensureInit();
  const { rows } = await sql`SELECT * FROM forms ORDER BY created_at DESC`;
  return rows.map(parseForm);
}

export async function getForm(id: string): Promise<Form | null> {
  await ensureInit();
  const { rows } = await sql`SELECT * FROM forms WHERE id = ${id}`;
  if (!rows[0]) return null;
  const form = parseForm(rows[0]);
  form.questions = await getQuestions(id);
  return form;
}

export async function createForm(data: {
  title: string;
  description?: string;
  welcome_screen?: object;
  thank_you_screen?: object;
  meta_pixel_id?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
}): Promise<Form> {
  await ensureInit();
  const now = new Date().toISOString();
  const id = generateId();
  await sql`
    INSERT INTO forms (id, title, description, welcome_screen, thank_you_screen, published, created_at, updated_at, meta_pixel_id, logo_url, brand_color)
    VALUES (
      ${id},
      ${data.title},
      ${data.description ?? null},
      ${data.welcome_screen ? JSON.stringify(data.welcome_screen) : null},
      ${data.thank_you_screen ? JSON.stringify(data.thank_you_screen) : null},
      FALSE,
      ${now},
      ${now},
      ${data.meta_pixel_id ?? null},
      ${data.logo_url ?? null},
      ${data.brand_color ?? null}
    )
  `;
  return (await getForm(id))!;
}

export async function updateForm(id: string, data: {
  title?: string;
  description?: string;
  welcome_screen?: object | null;
  thank_you_screen?: object | null;
  published?: boolean;
  meta_pixel_id?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  questions?: Array<{
    id?: string;
    type: string;
    title: string;
    description?: string;
    required?: boolean;
    order_index: number;
    options?: string[];
  }>;
}): Promise<Form | null> {
  await ensureInit();
  const now = new Date().toISOString();
  const { rows: existing } = await sql`SELECT id FROM forms WHERE id = ${id}`;
  if (!existing[0]) return null;

  if (data.title !== undefined) await sql`UPDATE forms SET title = ${data.title}, updated_at = ${now} WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE forms SET description = ${data.description}, updated_at = ${now} WHERE id = ${id}`;
  if (data.welcome_screen !== undefined) await sql`UPDATE forms SET welcome_screen = ${data.welcome_screen ? JSON.stringify(data.welcome_screen) : null}, updated_at = ${now} WHERE id = ${id}`;
  if (data.thank_you_screen !== undefined) await sql`UPDATE forms SET thank_you_screen = ${data.thank_you_screen ? JSON.stringify(data.thank_you_screen) : null}, updated_at = ${now} WHERE id = ${id}`;
  if (data.published !== undefined) await sql`UPDATE forms SET published = ${data.published}, updated_at = ${now} WHERE id = ${id}`;
  if (data.meta_pixel_id !== undefined) await sql`UPDATE forms SET meta_pixel_id = ${data.meta_pixel_id ?? null}, updated_at = ${now} WHERE id = ${id}`;
  if (data.logo_url !== undefined) await sql`UPDATE forms SET logo_url = ${data.logo_url ?? null}, updated_at = ${now} WHERE id = ${id}`;
  if (data.brand_color !== undefined) await sql`UPDATE forms SET brand_color = ${data.brand_color ?? null}, updated_at = ${now} WHERE id = ${id}`;

  // Always bump updated_at
  await sql`UPDATE forms SET updated_at = ${now} WHERE id = ${id}`;

  if (data.questions !== undefined) {
    const incomingIds = data.questions.filter(q => q.id).map(q => q.id as string);
    const { rows: existingQs } = await sql`SELECT id FROM questions WHERE form_id = ${id}`;
    for (const eq of existingQs) {
      if (!incomingIds.includes(eq.id)) {
        await sql`DELETE FROM questions WHERE id = ${eq.id}`;
      }
    }
    for (const q of data.questions) {
      if (q.id) {
        await sql`
          UPDATE questions SET type=${q.type}, title=${q.title}, description=${q.description ?? null},
          required=${q.required ?? false}, order_index=${q.order_index}, options=${q.options ? JSON.stringify(q.options) : null}
          WHERE id=${q.id}
        `;
      } else {
        await sql`
          INSERT INTO questions (id, form_id, type, title, description, required, order_index, options)
          VALUES (${generateId()}, ${id}, ${q.type}, ${q.title}, ${q.description ?? null}, ${q.required ?? false}, ${q.order_index}, ${q.options ? JSON.stringify(q.options) : null})
        `;
      }
    }
  }

  return getForm(id);
}

export async function deleteForm(id: string): Promise<boolean> {
  await ensureInit();
  const { rowCount } = await sql`DELETE FROM forms WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// ── Questions ──────────────────────────────────────────────────────────────

export async function getQuestions(formId: string): Promise<Question[]> {
  const { rows } = await sql`SELECT * FROM questions WHERE form_id = ${formId} ORDER BY order_index`;
  return rows.map(parseQuestion);
}

// ── Responses ──────────────────────────────────────────────────────────────

export async function createResponse(formId: string, answers: { question_id: string; value: string }[]): Promise<Response> {
  await ensureInit();
  const now = new Date().toISOString();
  const responseId = generateId();
  await sql`INSERT INTO responses (id, form_id, created_at) VALUES (${responseId}, ${formId}, ${now})`;
  for (const a of answers) {
    await sql`INSERT INTO answers (id, response_id, question_id, value) VALUES (${generateId()}, ${responseId}, ${a.question_id}, ${a.value})`;
  }
  return (await getResponse(responseId))!;
}

export async function getResponse(id: string): Promise<Response | null> {
  const { rows } = await sql`SELECT * FROM responses WHERE id = ${id}`;
  if (!rows[0]) return null;
  const { rows: answers } = await sql`SELECT * FROM answers WHERE response_id = ${id}`;
  return { ...rows[0], answers } as Response;
}

export async function listResponses(formId: string): Promise<Response[]> {
  await ensureInit();
  const { rows } = await sql`SELECT * FROM responses WHERE form_id = ${formId} ORDER BY created_at DESC`;
  const result: Response[] = [];
  for (const r of rows) {
    const { rows: answers } = await sql`SELECT * FROM answers WHERE response_id = ${r.id}`;
    result.push({ ...r, answers } as Response);
  }
  return result;
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseForm(row: Record<string, unknown>): Form {
  return {
    ...row,
    published: Boolean(row.published),
    welcome_screen: row.welcome_screen ? JSON.parse(row.welcome_screen as string) : null,
    thank_you_screen: row.thank_you_screen ? JSON.parse(row.thank_you_screen as string) : null,
  } as Form;
}

function parseQuestion(row: Record<string, unknown>): Question {
  return {
    ...row,
    required: Boolean(row.required),
    options: row.options ? JSON.parse(row.options as string) : null,
  } as Question;
}
