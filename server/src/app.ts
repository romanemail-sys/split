import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRouter from './routes/auth';

const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
