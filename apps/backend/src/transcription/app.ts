// apps/backend/src/transcription/app.ts
import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes';
import pollRoutes from './routes/pollRoutes';

const app = express();

app.use(cors({ origin: 'http://localhost:5174', credentials: true }));
app.use(express.json());

app.use('/api', uploadRoutes);
app.use('/api', pollRoutes);

export default app;
