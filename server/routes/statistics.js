const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:courseId', authenticateToken, async (req, res) => {
    try {
        const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.courseId]);
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (courses[0].teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [memberCount] = await pool.query(
            'SELECT COUNT(*) as count FROM course_members WHERE course_id = ?',
            [req.params.courseId]
        );

        const [checkinStats] = await pool.query(
            `SELECT cr.status, COUNT(*) as count
             FROM checkin_records cr
             JOIN checkins c ON cr.checkin_id = c.id
             WHERE c.course_id = ?
             GROUP BY cr.status`,
            [req.params.courseId]
        );

        const [assignmentStats] = await pool.query(
            `SELECT COUNT(*) as total,
                    SUM(CASE WHEN asub.score IS NOT NULL THEN 1 ELSE 0 END) as graded
             FROM assignments a
             LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
             WHERE a.course_id = ?`,
            [req.params.courseId]
        );

        const [questionStats] = await pool.query(
            'SELECT COUNT(*) as total, SUM(CASE WHEN status = "answered" THEN 1 ELSE 0 END) as answered FROM questions WHERE course_id = ?',
            [req.params.courseId]
        );

        res.json({
            memberCount: memberCount[0].count,
            checkinStats: checkinStats.reduce((acc, row) => { acc[row.status] = row.count; return acc; }, {}),
            assignmentStats: assignmentStats[0],
            questionStats: questionStats[0]
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

module.exports = router;
