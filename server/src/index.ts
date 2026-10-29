import express from 'express';
import http from 'http';
import cors from 'cors';
import itemRoutes from './routes/item.routes.js';
import { socketService } from './ws/socket.service.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PitStop API', timestamp: new Date().toISOString() });
});
app.use('/api/items', itemRoutes);

// HTTP + WebSocket Server
const server = http.createServer(app);
socketService.init(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Server] PitStop API ready on http://localhost:${PORT}`);
  console.log(`[WebSocket] Real-time service ready on ws://localhost:${PORT}`);
});
