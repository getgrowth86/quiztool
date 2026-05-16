export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'single_choice'
  | 'rating'
  | 'number'
  | 'email'
  | 'yes_no';

export interface Question {
  id: string;
  form_id: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  order_index: number;
  options: string[] | null; // for multiple_choice / single_choice
}

export interface CloseFieldMapping {
  name_question_id?: string;
  email_question_id?: string;
  phone_question_id?: string;
}

export interface Form {
  id: string;
  title: string;
  description: string | null;
  welcome_screen: WelcomeScreen | null;
  thank_you_screen: ThankYouScreen | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  meta_pixel_id?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  close_api_key?: string | null;
  close_field_mapping?: CloseFieldMapping | null;
}

export interface WelcomeScreen {
  title: string;
  description: string;
  button_text: string;
  subtext?: string;        // Kleiner Text unter dem Button z.B. "Aktuell werden neue Bewerber geprüft"
  trust_items?: string[];  // Trust-Texte mit Häkchen z.B. ["100% kostenlos", "Keine Verpflichtung"]
}

export interface ThankYouScreen {
  title: string;
  description: string;
  redirect_url?: string;
}

export interface Response {
  id: string;
  form_id: string;
  created_at: string;
  answers?: Answer[];
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  value: string;
}

// API shapes
export interface CreateFormPayload {
  title: string;
  description?: string;
  welcome_screen?: WelcomeScreen;
  thank_you_screen?: ThankYouScreen;
}

export interface UpdateFormPayload extends Partial<CreateFormPayload> {
  published?: boolean;
  questions?: Omit<Question, 'id' | 'form_id'>[];
}

export interface SubmitResponsePayload {
  answers: { question_id: string; value: string }[];
}
