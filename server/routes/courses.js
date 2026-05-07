const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/utils');

const router = express.Router();

router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const { name, code, description, classTime, location } = req.body;

        if (!name || !code) {
            return res.status(400).json({ error: 'Course name and code are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO courses (name, code, teacher_id, description, class_time, location) VALUES (?, ?, ?, ?, ?, ?)',
            [name, code, req.user.id, description || '', classTime || '', location || '']
        );

        res.json({
            id: result.insertId,
            name,
            code,
            description,
            classTime,
            location
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Course code already exists' });
        }
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'teacher') {
            const [rows] = await pool.query(
                'SELECT c.*, u.name as teacher_name FROM courses c JOIN users u ON c.teacher_id = u.id WHERE c.teacher_id = ?',
                [req.user.id]
            );
            courses = rows;
        } else {
            const [rows] = await pool.query(
                `SELECT c.*, u.name as teacher_name FROM courses c
                 JOIN course_members cm ON c.id = cm.course_id
                 JOIN users u ON c.teacher_id = u.id
                 WHERE cm.student_id = ?`,
                [req.user.id]
            );
            courses = rows;
        }
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to get courses' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT c.*, u.name as teacher_name FROM courses c JOIN users u ON c.teacher_id = u.id WHERE c.id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = rows[0];
        const isTeacher = course.teacher_id === req.user.id;

        if (!isTeacher) {
            const [members] = await pool.query(
                'SELECT * FROM course_members WHERE course_id = ? AND student_id = ?',
                [req.params.id, req.user.id]
            );
            if (members.length === 0) {
                return res.status(403).json({ error: 'Not a member of this course' });
            }
        }

        res.json(course);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get course' });
    }
});

router.post('/join', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Course code is required' });
        }

        const [courses] = await pool.query('SELECT * FROM courses WHERE code = ?', [code]);

        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = courses[0];

        const [existing] = await pool.query(
            'SELECT * FROM course_members WHERE course_id = ? AND student_id = ?',
            [course.id, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already joined this course' });
        }

        await pool.query(
            'INSERT INTO course_members (course_id, student_id) VALUES (?, ?)',
            [course.id, req.user.id]
        );

        res.json({ message: 'Successfully joined course', course });
    } catch (error) {
        console.error('Join course error:', error);
        res.status(500).json({ error: 'Failed to join course' });
    }
});

router.get('/:id/members', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.name, u.student_id, u.avatar, cm.joined_at
             FROM users u
             JOIN course_members cm ON u.id = cm.student_id
             WHERE cm.course_id = ?`,
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get members' });
    }
});

module.exports = router;
