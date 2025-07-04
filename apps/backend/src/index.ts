

import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './web/config/dbconnect';
import app from './transcription/app';
import setupSocket from './websocket/socket';
import { Request, Response, NextFunction } from 'express'; 

dotenv.config();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});


app.set('io', io);


app.use((req: Request & { io?: SocketIOServer }, res: Response, next: NextFunction) => {
  req.io = io;
  next();
});


connectDB();


setupSocket(io);


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});