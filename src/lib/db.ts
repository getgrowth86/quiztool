import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Form, Question, Response, Answer } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'typeform.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeDb(_db);
  }
  return _db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      welcome_screen TEXT,
      thank_you_screen TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      required INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      options TEXT,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
  `);

  // Seed example form if no forms exist
  const count = (db.prepare('SELECT COUNT(*) as c FROM forms').get() as { c: number }).c;
  if (count === 0) {
    seedExampleForm(db);
  }
}

function seedExampleForm(db: Database.Database) {
  const now = new Date().toISOString();
  const formId = generateId();

  db.prepare(`
    INSERT INTO forms (id, title, description, welcome_screen, thank_you_screen, published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    formId,
    'Customer Satisfaction Survey',
    'Help us improve by sharing your experience',
    JSON.stringify({
      title: 'We\'d love your feedback! 💜',
      description: 'This quick survey takes less than 2 minutes. Your answers help us build better products.',
      button_text: 'Start Survey',
    }),
    JSON.stringify({
      title: 'Thank you so much! 🎉',
      description: 'Your feedback means the world to us. We\'ll use it to keep improving.',
    }),
    1,
    now,
    now,
  );

  const questions: { type: string; title: string; description: string | null; required: number; options: string | null }[] = [
    {
      type: 'short_text',
      title: 'What\'s your name?',
      description: 'We\'d love to know who we\'re talking to.',
      required: 1,
      options: null,
    },
    {
      type: 'email',
      title: 'What\'s your email address?',
      description: 'We\'ll only use this to follow up if needed.',
      required: 1,
      options: null,
    },
    {
      type: 'rating',
      title: 'How would you rate your overall experience?',
      description: null,
      required: 1,
      options: null,
    },
    {
      type: 'single_choice',
      title: 'Which feature do you use most?',
      description: 'Pick the one you rely on the most.',
      required: 1,
      options: JSON.stringify(['Form Builder', 'Response Analytics', 'Sharing & Embedding', 'Integrations']),
    },
    {
      type: 'multiple_choice',
      title: 'What would you like to see improved?',
      description: 'Select all that apply.',
      required: 0,
      options: JSON.stringify(['Faster performance', 'More question types', 'Better analytics', 'Mobile app', 'Integrations', 'Design options']),
    },
    {
      type: 'yes_no',
      title: 'Would you recommend us to a friend?',
      description: null,
      required: 1,
      options: null,
    },
    {
      type: 'long_text',
      title: 'Any other thoughts or suggestions?',
      description: 'Feel free to share anything on your mind.',
      required: 0,
      options: null,
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    db.prepare(`
      INSERT INTO questions (id, form_id, type, title, description, required, order_index, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), formId, q.type, q.title, q.description, q.required, i, q.options);
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Forms ──────────────────────────────────────────────────────────────────

export function listForms(): Form[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM forms ORDER BY created_at DESC').all() as any[];
  return rows.map(parseForm);
}

export function getForm(id: string): Form | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id) as any;
  if (!row) return null;
  const form = parseForm(row);
  form.questions = getQuestions(id);
  return form;
}

export function createForm(data: {
  title: string;
  description?: string;
  welcome_screen?: object;
  thank_you_screen?: object;
}): Form {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId();
  db.prepare(`
    INSERT INTO forms (id, title, description, welcome_screen, thank_you_screen, published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    data.title,
    data.description ?? null,
    data.welcome_screen ? JSON.stringify(data.welcome_screen) : null,
    data.thank_you_screen ? JSON.stringify(data.thank_you_screen) : null,
    now,
    now,
  );
  return getForm(id)!;
}

export function updateForm(id: string, data: {
  title?: string;
  description?: string;
  welcome_screen?: object | null;
  thank_you_screen?: object | null;
  published?: boolean;
  questions?: Array<{
    id?: string;
    type: string;
    title: string;
    description?: string;
    required?: boolean;
    order_index: number;
    options?: string[];
  }>;
}): Form | null {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM forms WHERE id = ?').get(id);
  if (!existing) return null;

  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.welcome_screen !== undefined) { updates.push('welcome_screen = ?'); values.push(data.welcome_screen ? JSON.stringify(data.welcome_screen) : null); }
  if (data.thank_you_screen !== undefined) { updates.push('thank_you_screen = ?'); values.push(data.thank_you_screen ? JSON.stringify(data.thank_you_screen) : null); }
  if (data.published !== undefined) { updates.push('published = ?'); values.push(data.published ? 1 : 0); }

  values.push(id);
  db.prepare(`UPDATE forms SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  if (data.questions !== undefined) {
    // Delete removed questions; upsert the rest
    const incomingIds = data.questions.filter(q => q.id).map(q => q.id);
    const existingQs = db.prepare('SELECT id FROM questions WHERE form_id = ?').all(id) as { id: string }[];
    for (const eq of existingQs) {
      if (!incomingIds.includes(eq.id)) {
        db.prepare('DELETE FROM questions WHERE id = ?').run(eq.id);
      }
    }
    for (const q of data.questions) {
      if (q.id) {
        db.prepare(`
          UPDATE questions SET type=?, title=?, description=?, required=?, order_index=?, options=? WHERE id=?
        `).run(q.type, q.title, q.description ?? null, q.required ? 1 : 0, q.order_index, q.options ? JSON.stringify(q.options) : null, q.id);
      } else {
        db.prepare(`
          INSERT INTO questions (id, form_id, type, title, description, required, order_index, options)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(generateId(), id, q.type, q.title, q.description ?? null, q.required ? 1 : 0, q.order_index, q.options ? JSON.stringify(q.options) : null);
      }
    }
  }

  return getForm(id);
}

export function deleteForm(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM forms WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Questions ──────────────────────────────────────────────────────────────

export function getQuestions(formId: string): Question[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM questions WHERE form_id = ? ORDER BY order_index').all(formId) as any[];
  return rows.map(parseQuestion);
}

// ── Responses ──────────────────────────────────────────────────────────────

export function createResponse(formId: string, answers: { question_id: string; value: string }[]): Response {
  const db = getDb();
  const now = new Date().toISOString();
  const responseId = generateId();
  db.prepare('INSERT INTO responses (id, form_id, created_at) VALUES (?, ?, ?)').run(responseId, formId, now);
  for (const a of answers) {
    db.prepare('INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)').run(generateId(), responseId, a.question_id, a.value);
  }
  return getResponse(responseId)!;
}

export function getResponse(id: string): Response | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM responses WHERE id = ?').get(id) as any;
  if (!row) return null;
  const answers = db.prepare('SELECT * FROM answers WHERE response_id = ?').all(id) as Answer[];
  return { ...row, answers };
}

export function listResponses(formId: string): Response[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM responses WHERE form_id = ? ORDER BY created_at DESC').all(formId) as any[];
  return rows.map(r => {
    const answers = db.prepare('SELECT * FROM answers WHERE response_id = ?').all(r.id) as Answer[];
    return { ...r, answers };
  });
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseForm(row: any): Form {
  return {
    ...row,
    published: Boolean(row.published),
    welcome_screen: row.welcome_screen ? JSON.parse(row.welcome_screen) : null,
    thank_you_screen: row.thank_you_screen ? JSON.parse(row.thank_you_screen) : null,
  };
}

function parseQuestion(row: any): Question {
  return {
    ...row,
    required: Boolean(row.required),
    options: row.options ? JSON.parse(row.options) : null,
  };
}
