import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const prisma = new PrismaClient();
export const app = express();

const PORT = process.env.PORT || 4000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intente nuevamente más tarde.' },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', limiter);

import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import clientRoutes from './routes/clients';
import serviceRoutes from './routes/services';
import quotationRoutes from './routes/quotations';
import contractRoutes from './routes/contracts';
import dashboardRoutes from './routes/dashboard';
import documentRoutes from './routes/documents';
import auditRoutes from './routes/audit';

app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor OMNES corriendo en puerto ${PORT}`);
});
