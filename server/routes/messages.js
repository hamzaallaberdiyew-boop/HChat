import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const { receiver_id, content, reply_to_id } = req.body;
    if (!content || !content.trim() || !receiver_id) {
        return res.status(400).json({ error: 'Missing required fields!' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, content, reply_to_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [myId, receiver_id, content.trim(), reply_to_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.patch('/:messageId/react', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
        return res.status(400).json({ error: 'Missing emoji' });
    }

    try {
        const messageResult = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [messageId]
        );

        const message = messageResult.rows[0];
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        if (message.deleted) {
            return res.status(400).json({ error: 'Cannot react to a deleted message' });
        }

        let column;
        if (message.sender_id === myId) {
            column = 'sender_reaction';
        } else if (message.receiver_id === myId) {
            column = 'receiver_reaction';
        } else {
            return res.status(403).json({ error: 'Not part of this conversation' });
        }

        const currentValue = message[column];
        const newValue = currentValue === emoji ? null : emoji;

        const updateResult = await pool.query(
            `UPDATE messages SET ${column} = $1 WHERE id = $2 RETURNING *`,
            [newValue, messageId]
        );

        const updatedMessage = updateResult.rows[0];

        const io = req.app.get('io');
        io.to(updatedMessage.sender_id.toString()).emit('reactionUpdate', updatedMessage);
        io.to(updatedMessage.receiver_id.toString()).emit('reactionUpdate', updatedMessage);

        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error('React to message error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.patch('/:messageId', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    try {
        const messageResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        const message = messageResult.rows[0];

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        if (message.sender_id !== myId) {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }
        if (message.deleted) {
            return res.status(400).json({ error: 'Cannot edit a deleted message' });
        }

        const updateResult = await pool.query(
            'UPDATE messages SET content = $1, edited = TRUE WHERE id = $2 RETURNING *',
            [content.trim(), messageId]
        );

        const updatedMessage = updateResult.rows[0];

        const io = req.app.get('io');
        io.to(updatedMessage.sender_id.toString()).emit('messageUpdate', updatedMessage);
        io.to(updatedMessage.receiver_id.toString()).emit('messageUpdate', updatedMessage);

        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error('Edit message error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.delete('/:messageId', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const { messageId } = req.params;

    try {
        const messageResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        const message = messageResult.rows[0];

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        if (message.sender_id !== myId) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        const updateResult = await pool.query(
            'UPDATE messages SET deleted = TRUE, content = $1 WHERE id = $2 RETURNING *',
            ['This message was deleted', messageId]
        );

        const updatedMessage = updateResult.rows[0];

        const io = req.app.get('io');
        io.to(updatedMessage.sender_id.toString()).emit('messageUpdate', updatedMessage);
        io.to(updatedMessage.receiver_id.toString()).emit('messageUpdate', updatedMessage);

        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/conversations/latest', verifyToken, async (req, res) => {
    const myId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT
                latest.*,
                COALESCE(unread.unread_count, 0) AS unread_count
             FROM (
                SELECT * FROM (
                    SELECT DISTINCT ON (other_user_id)
                        other_user_id,
                        content AS last_message,
                        sent_time AS last_message_time,
                        sender_id
                    FROM (
                        SELECT
                            m.*,
                            CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id
                        FROM messages m
                        WHERE sender_id = $1 OR receiver_id = $1
                    ) sub
                    ORDER BY other_user_id, sent_time DESC
                ) inner_latest
                JOIN users u ON u.id = inner_latest.other_user_id
             ) latest
             LEFT JOIN (
                SELECT sender_id, COUNT(*) AS unread_count
                FROM messages
                WHERE receiver_id = $1 AND read = FALSE
                GROUP BY sender_id
             ) unread ON unread.sender_id = latest.other_user_id
             ORDER BY latest.last_message_time DESC`,
            [myId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get latest conversations error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.patch('/:userId/read', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        await pool.query(
            'UPDATE messages SET read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE',
            [otherUserId, myId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Mark as read error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/:userId', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    try {
        const result = await pool.query(
            `SELECT 
                m.*,
                r.content AS reply_content,
                r.sender_id AS reply_sender_id
             FROM messages m
             LEFT JOIN messages r ON m.reply_to_id = r.id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2)
             OR (m.sender_id = $2 AND m.receiver_id = $1)
             ORDER BY m.sent_time ASC`,
            [myId, otherUserId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;