import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes';
import { setupSocketHandlers } from './socket';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);
app.use(errorHandler);

setupSocketHandlers(io);

httpServer.listen(config.port, () => {
  console.log(`Chess backend running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export { io };
