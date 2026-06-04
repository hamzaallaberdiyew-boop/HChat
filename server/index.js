import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from './db.js';
import authRoutes from "./routes/auth.js"
import messageRoutes from './routes/messages.js';
import { createServer } from 'http';
import {Server} from 'socket.io';

dotenv.config();

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => res.send('HChat server running!'));

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('Database connection failed:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined their room`);
  });

  socket.on('sendMessage', (message) => {
    io.to(message.receiver_id.toString()).emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(port, () => console.log('Server on port 5000'));