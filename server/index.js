import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from './db.js';
import authRoutes from "./routes/auth.js"
import messageRoutes from './routes/messages.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

// На Render порт передается автоматически через переменную окружения PORT
const port = process.env.PORT || 5000;

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'https://h-chat-nine.vercel.app']
}));
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
    origin: ['http://localhost:3000', 'https://h-chat-nine.vercel.app'],
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

const onlineUsers = new Map();

function markUserOnline(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socketId);
}

function markUserOffline(userId, socketId) {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);

    if (sockets.size === 0) {
        onlineUsers.delete(userId);
        return true; 
    }
    return false; 
}

function isUserOnline(userId) {
    return onlineUsers.has(userId);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
        console.log('[BACKEND] received join for user', userId);
        socket.join(userId.toString());
        socket.data.userId = userId;

        const wasAlreadyOnline = isUserOnline(userId);
        markUserOnline(userId, socket.id);
        console.log('[BACKEND] onlineUsers map now:', Array.from(onlineUsers.entries()));

        if (!wasAlreadyOnline) {
            io.emit('userOnline', userId);
        }

        socket.emit('onlineUsersList', Array.from(onlineUsers.keys()));
        console.log(`User ${userId} joined their room`);
    });

    socket.on('sendMessage', (message) => {
        io.to(message.sender_id.toString()).emit('receiveMessage', message);
        io.to(message.receiver_id.toString()).emit('receiveMessage', message);
    });

    socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const userId = socket.data.userId;
    if (userId) {
        const trulyOffline = markUserOffline(userId, socket.id);
        if (trulyOffline) {
            io.emit('userOffline', userId);
            try {
                await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
            } catch (err) {
                console.error('Failed to update last_seen:', err);
            }
            console.log(`User ${userId} is now fully offline`);
        }
    }
});
});

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавлен запуск прослушивания порта.
// Для Socket.io нужно запускать именно httpServer, а не app.listen!
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
