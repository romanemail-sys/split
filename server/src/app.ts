import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config';
import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';

const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
