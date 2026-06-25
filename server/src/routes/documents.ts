import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.svg', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido'));
  },
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.clienteId) where.clienteId = parseInt(req.query.clienteId as string);
    if (req.query.tipo) where.tipo = req.query.tipo;
    if (req.query.desde) where.createdAt = { ...where.createdAt, gte: new Date(req.query.desde as string) };
    if (req.query.hasta) where.createdAt = { ...where.createdAt, lte: new Date(req.query.hasta as string) };
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string } },
        { client: { name: { contains: req.query.search as string } } },
      ];
    }
    const documents = await prisma.document.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        quotation: { select: { id: true, correlativo: true } },
        contract: { select: { id: true, correlativo: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  } catch {
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Debe seleccionar un archivo' });
    const { name, clienteId, quotationId, contractId } = req.body;
    const doc = await prisma.document.create({
      data: {
        name: name || req.file.originalname,
        tipo: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
        filePath: `/uploads/${req.file.filename}`,
        clienteId: clienteId ? parseInt(clienteId) : null,
        quotationId: quotationId ? parseInt(quotationId) : null,
        contractId: contractId ? parseInt(contractId) : null,
        userId: req.user!.userId,
      },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'SUBIR', entidad: 'Document', entidadId: doc.id, detalle: `Documento ${doc.name} subido`, ip: req.ip },
    });
    res.status(201).json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al subir documento' });
  }
});

router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    const filePath = path.join(__dirname, '../../', doc.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    res.download(filePath, doc.name);
  } catch {
    res.status(500).json({ error: 'Error al descargar documento' });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    const filePath = path.join(__dirname, '../../', doc.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ message: 'Documento eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

export default router;
