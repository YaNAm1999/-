const express = require('express');
const pool = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { code, name, role, studentId, phone } = req.body;

        if (!code || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE openid = ?',
            [code]
        );

        let user;
        if (existingUsers.length > 0) {
            user = existingUsers[0];
        } else {
            const [result] = await pool.query(
                'INSERT INTO users (openid, name, role, student_id, phone) VALUES (?, ?, ?, ?, ?)',
                [code, name, role, studentId || null, phone || null]
            );
            const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = newUsers[0];
        }

        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                studentId: user.student_id,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/me', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];
        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            studentId: user.student_id,
            phone: user.phone,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

module.exports = router;
