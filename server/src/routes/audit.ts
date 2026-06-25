import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const where: any = {};
    if (req.query.accion) where.accion = req.query.accion;
    if (req.query.entidad) where.entidad = req.query.entidad;
    if (req.query.userId) where.userId = parseInt(req.query.userId as string);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data: logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
});

export default router;
