import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'omnes-default-secret-2026';

const DATA_DIR = process.cwd();
export const UPLOADS_PATH = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'dev.db');

function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_PATH)) fs.mkdirSync(UPLOADS_PATH, { recursive: true });

  const logoDest = path.join(UPLOADS_PATH, 'logo-omnes.png');
  if (!fs.existsSync(logoDest)) {
    const logoSource = path.join(__dirname, '../../uploads/logo-omnes.png');
    if (fs.existsSync(logoSource)) fs.copyFileSync(logoSource, logoDest);
  }

  if (!fs.existsSync(DB_PATH)) {
    const sourceDb = path.join(__dirname, '../prisma/dev.db');
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, DB_PATH);
      console.log('✓ Base de datos inicializada');
    }
  }
}
ensureDirectories();

process.env.DATABASE_URL = `file:${DB_PATH}`;
export const prisma = new PrismaClient();
export const app = express();

const PORT = process.env.PORT || 4000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intente nuevamente más tarde.' },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_PATH));
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

const clientBuildPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

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
