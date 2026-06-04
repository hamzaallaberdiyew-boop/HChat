import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import jwt from 'jsonwebtoken';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.get('/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE id != $1',
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch(err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if(result.rows.length > 0){
        return res.status(400).json({error:'Username already taken!'})
    } else{
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
  [username, hashedPassword]);
        const token = jwt.sign(
                {id : newUser.rows[0].id, username: newUser.rows[0].username}, 
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.status(200).json({ token });
    }} catch(err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

router.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if(result.rows.length > 0){
            const isMatch = await bcrypt.compare(password, result.rows[0].password_hash)
            if(!isMatch){
                return res.status(400).json({error:'Invalid username or password!'})
            } 
            const token = jwt.sign(
                {id : result.rows[0].id, username: result.rows[0].username}, 
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.status(200).json({ token });
    } else{
        return res.status(400).json({error:'Invalid username or password!'})
    }} catch(err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
})

export default router;