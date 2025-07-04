import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Poll from '../models/pollSchema';

interface CustomRequest extends Request {
  io?: SocketIOServer;
}

export const createPoll = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    // Deactivate all previous active questions
    await Poll.updateMany(
      { 'questions.is_active': true },
      { $set: { 'questions.$[].is_active': false } }
    );

    // Create new poll with active question
    const poll = await Poll.create(req.body);
    const newQuestion = poll.questions.at(-1);

    if (newQuestion?.is_active && newQuestion?.is_approved) {
      // Broadcast to all connected clients
      req.app.get('io').emit('poll-question', newQuestion);
      console.log("📢 Sent new question to students");
    }

    res.status(201).json(poll);
  } catch (err) {
    console.error("❌ Poll creation error:", err);
    res.status(500).json({ error: "Poll creation failed" });
  }
};