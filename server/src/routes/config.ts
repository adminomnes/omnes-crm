import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

import { UPLOADS_PATH } from '../index';
const uploadDir = UPLOADS_PATH;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
}});

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.companyConfig.findFirst({ include: { legalRepresentative: true } });
    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          razonSocial: 'OMNES Holding SpA',
          nombreComercial: 'OMNES',
          rut: '',
          giroComercial: '',
          direccion: '',
          ciudad: '',
          pais: 'Chile',
          telefono: '',
          correo: '',
          sitioWeb: '',
        },
        include: { legalRepresentative: true },
      });
    }
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

router.put('/', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      razonSocial: z.string().min(1),
      nombreComercial: z.string().min(1),
      rut: z.string().min(1),
      giroComercial: z.string().min(1),
      direccion: z.string().min(1),
      ciudad: z.string().min(1),
      pais: z.string().min(1),
      telefono: z.string().min(1),
      correo: z.string().email(),
      sitioWeb: z.string(),
      colores: z.string().optional(),
      firmaDigital: z.string().optional(),
      piePagina: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const existing = await prisma.companyConfig.findFirst();
    if (existing) {
      const config = await prisma.companyConfig.update({ where: { id: existing.id }, data, include: { legalRepresentative: true } });
      return res.json(config);
    }
    const config = await prisma.companyConfig.create({ data, include: { legalRepresentative: true } });
    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

router.put('/legal', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      nombreCompleto: z.string().min(1),
      rut: z.string().min(1),
      cargo: z.string().min(1),
      correo: z.string().email(),
      telefono: z.string().min(1),
    });
    const data = schema.parse(req.body);
    const config = await prisma.companyConfig.findFirst();
    if (!config) return res.status(404).json({ error: 'Configure la empresa primero' });
    const rep = await prisma.legalRepresentative.upsert({
      where: { companyConfigId: config.id },
      update: data,
      create: { ...data, companyConfigId: config.id },
    });
    res.json(rep);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar representante legal' });
  }
});

router.post('/logo', authenticate, authorize('ADMIN', 'GERENCIA'), upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Debe seleccionar un archivo' });
    const config = await prisma.companyConfig.findFirst();
    if (!config) return res.status(404).json({ error: 'Configure la empresa primero' });
    const field = req.body.tipo === 'secundario' ? 'logoSecundario' : 'logoPrincipal';
    const updated = await prisma.companyConfig.update({
      where: { id: config.id },
      data: { [field]: `/uploads/${req.file.filename}` },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al subir logo' });
  }
});

export default router;
