const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/utils');

const router = express.Router();

router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const { courseId, title, content, deadline, attachmentUrl } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO assignments (course_id, teacher_id, title, content, deadline, attachment_url) VALUES (?, ?, ?, ?, ?, ?)',
            [courseId, req.user.id, title, content || '', deadline || null, attachmentUrl || null]
        );

        res.json({
            id: result.insertId,
            courseId,
            title,
            content,
            deadline,
            attachmentUrl
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ error: 'Failed to create assignment' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { courseId } = req.query;
        let query = 'SELECT a.*, c.name as course_name, u.name as teacher_name FROM assignments a JOIN courses c ON a.course_id = c.id JOIN users u ON a.teacher_id = u.id';
        const params = [];

        if (courseId) {
            query += ' WHERE a.course_id = ?';
            params.push(courseId);
        }

        if (req.user.role === 'student') {
            if (courseId) {
                query += ' AND';
            } else {
                query += ' WHERE';
            }
            query += ' a.course_id IN (SELECT course_id FROM course_members WHERE student_id = ?)';
            params.push(req.user.id);
        }

        query += ' ORDER BY a.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get assignments' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.*, c.name as course_name, u.name as teacher_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.id
             JOIN users u ON a.teacher_id = u.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        if (req.user.role === 'student') {
            const [submission] = await pool.query(
                'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
                [req.params.id, req.user.id]
            );
            rows[0].mySubmission = submission[0] || null;
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get assignment' });
    }
});

router.post('/:id/submit', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can submit assignments' });
        }

        const { content, attachmentUrl } = req.body;

        const [existing] = await pool.query(
            'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
            [req.params.id, req.user.id]
        );

        if (existing.length > 0) {
            await pool.query(
                'UPDATE assignment_submissions SET content = ?, attachment_url = ?, submitted_at = NOW() WHERE id = ?',
                [content || '', attachmentUrl || '', existing[0].id]
            );
            return res.json({ message: 'Assignment updated successfully' });
        }

        await pool.query(
            'INSERT INTO assignment_submissions (assignment_id, student_id, content, attachment_url) VALUES (?, ?, ?, ?)',
            [req.params.id, req.user.id, content || '', attachmentUrl || null]
        );

        res.json({ message: 'Assignment submitted successfully' });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({ error: 'Failed to submit assignment' });
    }
});

router.get('/:id/submissions', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT asub.*, u.name, u.student_id
             FROM assignment_submissions asub
             JOIN users u ON asub.student_id = u.id
             WHERE asub.assignment_id = ?`,
            [req.params.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get submissions' });
    }
});

router.post('/:id/grade', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const { submissionId, score, feedback } = req.body;

        await pool.query(
            'UPDATE assignment_submissions SET score = ?, feedback = ? WHERE id = ?',
            [score, feedback || '', submissionId]
        );

        res.json({ message: 'Graded successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to grade assignment' });
    }
});

module.exports = router;
