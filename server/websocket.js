const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

const clients = new Map();

function setupWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        let clientInfo = { ws, courseId: null, userId: null, role: null };

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'auth') {
                    jwt.verify(data.token, JWT_SECRET, (err, user) => {
                        if (err) {
                            ws.send(JSON.stringify({ error: 'Invalid token' }));
                            return;
                        }
                        clientInfo.userId = user.id;
                        clientInfo.role = user.role;
                        ws.send(JSON.stringify({ type: 'auth_success' }));
                    });
                } else if (data.type === 'subscribe') {
                    clientInfo.courseId = data.courseId;
                } else if (data.type === 'heartbeat') {
                    ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
        });

        clients.set(ws, clientInfo);
    });

    setInterval(() => {
        clients.forEach((clientInfo, ws) => {
            if (clientInfo.ws.readyState === 1) {
                clientInfo.ws.ping();
            }
        });
    }, 30000);

    return wss;
}

function broadcastCheckin(courseId, message) {
    clients.forEach((clientInfo) => {
        if (clientInfo.courseId === courseId && clientInfo.ws.readyState === 1) {
            clientInfo.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastQuestion(courseId, message) {
    clients.forEach((clientInfo) => {
        if (clientInfo.courseId === courseId && clientInfo.ws.readyState === 1) {
            clientInfo.ws.send(JSON.stringify(message));
        }
    });
}

module.exports = { setupWebSocket, broadcastCheckin, broadcastQuestion };
