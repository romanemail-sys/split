import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { config } from './config';
import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';
import groupsRouter from './routes/groups';
import expensesRouter from './routes/expenses';
import categoriesRouter from './routes/categories';
import uploadsRouter from './routes/uploads';
import currencyRouter from './routes/currency';
import meRouter from './routes/me';
import adminRouter from './routes/admin';

const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
