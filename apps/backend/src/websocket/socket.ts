import { Server, Socket } from 'socket.io';
import Poll from '../web/models/pollSchema';

export default (io: Server) => {
  io.on('connection', async (socket: Socket) => {
    console.log('🧑‍🎓 Student connected:', socket.id);

    const sendActiveQuestion = async () => {
      try {
        const poll = await Poll.findOne({
          'questions.is_active': true,
          'questions.is_approved': true
        }).sort({ 'questions.created_at': -1 });

        const activeQuestion = poll?.questions.find(q => 
          q.is_active && q.is_approved
        );

        if (activeQuestion) {
          io.emit('poll-question', activeQuestion);
          console.log(`✅ Sent active question: ${activeQuestion.question}`);
        } else {
          socket.emit('no-active-question');
        }
      } catch (err) {
        console.error('❌ Error fetching active question:', err);
      }
    };

    // Send active question on connection
    await sendActiveQuestion();

    // Handle next-question requests
    socket.on('next-question', async () => {
      await sendActiveQuestion();
    });
  });
};