import express from 'express';
import http from 'http';
import cors from 'cors';
import itemRoutes from './routes/item.routes.js';
import { socketService } from './ws/socket.service.js';
import { generateToken } from './middleware/auth.middleware.js';
import { userStore } from './store/item.store.js';
import type { AuthenticatedUser } from './types/item.types.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PitStop API', timestamp: new Date().toISOString() });
});

// Dynamic User Registration
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = userStore.findByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const user = userStore.create({
    email: normalizedEmail,
    password,
    name: name && typeof name === 'string' && name.trim() ? name.trim() : normalizedEmail.split('@')[0]
  });

  const authUser: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {})
  };
  const token = generateToken(authUser);
  return res.status(201).json({ token, user: authUser });
});

// Dynamic User Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = userStore.findByEmail(normalizedEmail);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const authUser: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {})
  };
  const token = generateToken(authUser);
  return res.json({ token, user: authUser });
});

// Item Routes
app.use('/api/items', itemRoutes);

// HTTP + WebSocket Server
const server = http.createServer(app);
socketService.init(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Server] PitStop API ready on http://localhost:${PORT}`);
  console.log(`[WebSocket] Real-time service ready on ws://localhost:${PORT}/ws?token=YOUR_TOKEN`);
});
