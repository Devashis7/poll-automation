// models/Poll.ts
import { Schema, model, Document } from 'mongoose';
import questionSchema, { QuestionType } from './Question';

export interface PollType extends Document {
  questionFrequencyMinutes: number;
  questionsPerPoll: number;
  visibilityMinutes: number;
  difficulty: string;
  questions: QuestionType[];
}

const pollSchema = new Schema<PollType>({
  questionFrequencyMinutes: { type: Number, required: true },
  questionsPerPoll: { type: Number, required: true },
  visibilityMinutes: { type: Number, required: true },
  difficulty: { type: String, required: true },
  questions: { type: [questionSchema], required: true },
});

const Poll = model<PollType>('Poll', pollSchema);
export default Poll;
