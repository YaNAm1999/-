const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/utils');
const { broadcastQuestion } = require('../websocket');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { courseId, content, isAnonymous } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Question content is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO questions (course_id, student_id, content, is_anonymous) VALUES (?, ?, ?, ?)',
            [courseId, req.user.id, content, isAnonymous || false]
        );

        const questionId = result.insertId;

        broadcastQuestion(courseId, { type: 'new_question', questionId, content, isAnonymous });

        res.json({
            id: questionId,
            courseId,
            content,
            isAnonymous,
            status: 'pending'
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({ error: 'Failed to create question' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { courseId, status } = req.query;
        let query = `SELECT q.*, u.name as student_name, a.content as answer_content, au.name as teacher_name
                     FROM questions q
                     JOIN users u ON q.student_id = u.id
                     LEFT JOIN answers a ON q.id = a.question_id
                     LEFT JOIN users au ON a.teacher_id = au.id
                     WHERE 1=1`;
        const params = [];

        if (courseId) {
            query += ' AND q.course_id = ?';
            params.push(courseId);
        }

        if (status) {
            query += ' AND q.status = ?';
            params.push(status);
        }

        if (req.user.role === 'student') {
            query += ' AND (q.student_id = ? OR q.is_anonymous = FALSE)';
            params.push(req.user.id);
        }

        query += ' ORDER BY q.created_at DESC';

        const [rows] = await pool.query(query, params);

        const questions = rows.map(row => ({
            id: row.id,
            courseId: row.course_id,
            content: row.content,
            isAnonymous: row.is_anonymous,
            status: row.status,
            studentName: row.is_anonymous && row.student_id !== req.user.id ? '匿名学生' : row.student_name,
            createdAt: row.created_at,
            answer: row.answer_content ? {
                content: row.answer_content,
                teacherName: row.teacher_name,
                createdAt: row.answer_created_at
            } : null
        }));

        res.json(questions);
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to get questions' });
    }
});

router.post('/:id/answer', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Answer content is required' });
        }

        const [questions] = await pool.query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
        if (questions.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const [existing] = await pool.query('SELECT * FROM answers WHERE question_id = ?', [req.params.id]);
        if (existing.length > 0) {
            await pool.query('UPDATE answers SET content = ? WHERE id = ?', [content, existing[0].id]);
        } else {
            await pool.query(
                'INSERT INTO answers (question_id, teacher_id, content) VALUES (?, ?, ?)',
                [req.params.id, req.user.id, content]
            );
            await pool.query('UPDATE questions SET status = "answered" WHERE id = ?', [req.params.id]);
        }

        res.json({ message: 'Answer submitted successfully' });
    } catch (error) {
        console.error('Answer question error:', error);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});

module.exports = router;
