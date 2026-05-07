require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const initDatabase = require('./dbInit');
const { setupWebSocket } = require('./websocket');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const checkinRoutes = require('./routes/checkins');
const assignmentRoutes = require('./routes/assignments');
const questionRoutes = require('./routes/questions');
const statisticsRoutes = require('./routes/statistics');

const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/statistics', statisticsRoutes);

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, async () => {
    await initDatabase();
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    server.close();
    const pool = require('./db');
    await pool.end();
    process.exit(0);
});

module.exports = app;
