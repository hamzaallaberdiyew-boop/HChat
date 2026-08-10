import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const { receiver_id, content } = req.body;
    if(!content || !receiver_id) {
        return res.status(400).json({ error: 'Missing required fields!' });
    }
    try{
        const result = await pool.query('INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [myId, receiver_id, content]
)
    res.status(201).json(result.rows[0]);
    } catch(err){
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
    

})

router.get('/:userId', verifyToken, async (req, res) => {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    try {
        const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY sent_time ASC`,
      [myId, otherUserId]
    );
    res.status(200).json(result.rows);
} catch(err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
})

router.get('/conversations/latest', verifyToken, async (req, res) => {
    const myId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT * FROM (
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
            ) latest
            JOIN users u ON u.id = latest.other_user_id
            ORDER BY last_message_time DESC`,
            [myId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get latest conversations error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;