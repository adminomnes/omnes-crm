import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';

const router = Router();

const serviceSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  categoria: z.string().min(1, 'Categoría requerida'),
  descripcion: z.string().optional(),
  valorBase: z.number().min(0, 'Valor base debe ser >= 0'),
  impuesto: z.number().default(19),
  activo: z.boolean().default(true),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.activo === 'true') where.activo = true;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' as const } },
        { categoria: { contains: req.query.search as string, mode: 'insensitive' as const } },
      ];
    }
    const services = await prisma.service.findMany({ where, orderBy: { name: 'asc' } });
    res.json(services);
  } catch {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch {
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'CREAR', entidad: 'Service', entidadId: service.id, detalle: `Servicio ${service.name} creado`, ip: req.ip },
    });
    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

router.put('/:id', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: parseInt(req.params.id) }, data });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'EDITAR', entidad: 'Service', entidadId: service.id, detalle: `Servicio ${service.name} editado`, ip: req.ip },
    });
    res.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.service.delete({ where: { id: parseInt(req.params.id) } });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'ELIMINAR', entidad: 'Service', entidadId: parseInt(req.params.id), detalle: `Servicio ID ${req.params.id} eliminado`, ip: req.ip },
    });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

export default router;
