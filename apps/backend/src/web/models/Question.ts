// models/Question.ts
import { Schema, Types } from 'mongoose';

export interface QuestionType {
  _id?: Types.ObjectId;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  concept: string;
  meeting_id: string;
  created_at: Date;
  is_active: boolean;
  is_approved: boolean;
}

const questionSchema = new Schema<QuestionType>({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correct_answer: { type: String, required: true },
  explanation: { type: String },
  difficulty: { type: String },
  concept: { type: String },
  meeting_id: { type: String },
  created_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: false },
  is_approved: { type: Boolean, default: false },
});

export default questionSchema;
