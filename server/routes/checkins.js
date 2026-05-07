const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, calculateDistance, generateCheckinCode } = require('../middleware/utils');
const { broadcastCheckin } = require('../websocket');

const router = express.Router();

router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const { courseId, duration, location } = req.body;

        const [courses] = await pool.query('SELECT * FROM courses WHERE id = ? AND teacher_id = ?', [courseId, req.user.id]);
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found or not authorized' });
        }

        const code = generateCheckinCode();
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration || 30) * 60 * 1000);

        const [result] = await pool.query(
            'INSERT INTO checkins (course_id, teacher_id, code, start_time, end_time, location_lat, location_lng, location_radius) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [courseId, req.user.id, code, startTime, endTime, location?.lat || null, location?.lng || null, location?.radius || 100]
        );

        res.json({
            id: result.insertId,
            code,
            startTime,
            endTime,
            duration
        });

        broadcastCheckin(courseId, { type: 'new_checkin', checkinId: result.insertId, code });
    } catch (error) {
        console.error('Create checkin error:', error);
        res.status(500).json({ error: 'Failed to create check-in' });
    }
});

router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const { checkinId, location } = req.body;

        const [checkins] = await pool.query('SELECT * FROM checkins WHERE id = ? AND status = "active"', [checkinId]);

        if (checkins.length === 0) {
            return res.status(404).json({ error: 'Check-in not found or ended' });
        }

        const checkin = checkins[0];

        if (new Date() > new Date(checkin.end_time)) {
            await pool.query('UPDATE checkins SET status = "ended" WHERE id = ?', [checkinId]);
            return res.status(400).json({ error: 'Check-in has ended' });
        }

        const [existing] = await pool.query(
            'SELECT * FROM checkin_records WHERE checkin_id = ? AND student_id = ?',
            [checkinId, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already checked in' });
        }

        let status = 'present';
        if (checkin.location_lat && checkin.location_lng && location) {
            const distance = calculateDistance(
                checkin.location_lat, checkin.location_lng,
                location.lat, location.lng
            );
            if (distance > checkin.location_radius) {
                status = 'absent';
            }
        }

        await pool.query(
            'INSERT INTO checkin_records (checkin_id, student_id, status, location_lat, location_lng) VALUES (?, ?, ?, ?, ?)',
            [checkinId, req.user.id, status, location?.lat || null, location?.lng || null]
        );

        res.json({ message: 'Check-in successful', status });
    } catch (error) {
        console.error('Verify checkin error:', error);
        res.status(500).json({ error: 'Failed to verify check-in' });
    }
});

router.get('/active', authenticateToken, async (req, res) => {
    try {
        const { courseId } = req.query;

        let query = 'SELECT c.*, co.name as course_name FROM checkins c JOIN courses co ON c.course_id = co.id WHERE c.status = "active" AND c.end_time > NOW()';
        const params = [];

        if (courseId) {
            query += ' AND c.course_id = ?';
            params.push(courseId);
        }

        if (req.user.role === 'student') {
            query += ' AND c.course_id IN (SELECT course_id FROM course_members WHERE student_id = ?)';
            params.push(req.user.id);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get active check-ins' });
    }
});

router.get('/:id/records', authenticateToken, async (req, res) => {
    try {
        const [checkins] = await pool.query('SELECT * FROM checkins WHERE id = ?', [req.params.id]);
        if (checkins.length === 0) {
            return res.status(404).json({ error: 'Check-in not found' });
        }

        if (checkins[0].teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [records] = await pool.query(
            `SELECT cr.*, u.name, u.student_id
             FROM checkin_records cr
             JOIN users u ON cr.student_id = u.id
             WHERE cr.checkin_id = ?`,
            [req.params.id]
        );

        const [members] = await pool.query(
            'SELECT u.id, u.name, u.student_id FROM users u JOIN course_members cm ON u.id = cm.student_id WHERE cm.course_id = ?',
            [checkins[0].course_id]
        );

        const presentIds = new Set(records.map(r => r.student_id));
        const absent = members.filter(m => !presentIds.has(m.id));

        res.json({ records, absent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get check-in records' });
    }
});

module.exports = router;
