import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { seedDatabase } from '../backend/src/db/seed.ts';
import { apiRouter } from '../backend/src/routes/api.ts';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

let isSeeded = false;

app.use(async (_req, _res, next) => {
  if (!isSeeded) {
    await seedDatabase(false);
    isSeeded = true;
  }
  next();
});

app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SIM-ASRAMA Backend API (Vercel Serverless Ready)',
  });
});

export default app;
