import { Server } from 'socket.io';
import Question from '../models/question.model';
// import HostSettings from '../models/HostSettings';

let io: Server;

export const initializeStudentSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'], // Add frontend URLs
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Student connected:', socket.id);

    // Handle joining a room (for future use)
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`Student ${socket.id} joined room ${roomId}`);
    });

    // Handle poll responses
    socket.on('poll-response', (data: any) => {
      console.log('📝 Poll response received:', data);
      // Handle the response logic here
    });

    socket.on('disconnect', () => {
      console.log('❌ Student disconnected:', socket.id);
    });
  });

  console.log('🔌 Socket.IO server initialized');
};

// function to emit question based on host settings
export const sendPollToStudents = async () => {
  try {
    const questions = await Question.aggregate([
      { $match: { is_active: true, is_approved: true } },
      { $sample: { size: 5 } },
    ]);

    console.log('📤 Sending poll to students:', questions.length, 'questions');
    io.emit('poll', questions); // send to all connected clients

    return { success: true, questionsCount: questions.length };
  } catch (error) {
    console.error('❌ Error sending poll to students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export the socket instance for external use
export const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
};
