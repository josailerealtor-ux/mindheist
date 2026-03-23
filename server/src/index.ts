import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import trapsRouter from './routes/traps';
import attemptsRouter from './routes/attempts';
import replaysRouter from './routes/replays';
import socialRouter from './routes/social';
import { rateLimit } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(rateLimit(100, 60_000)); // 100 req/min per IP

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/traps', trapsRouter);
app.use('/api', attemptsRouter);
app.use('/api', replaysRouter);
app.use('/api', socialRouter);

app.listen(PORT, () => {
  console.log(`MindHeist server running on port ${PORT}`);
});

export default app;
