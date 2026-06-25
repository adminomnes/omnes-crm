import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  empresa: z.string().min(1, 'Empresa requerida'),
  rut: z.string().min(1, 'RUT requerido'),
  correo: z.string().email('Correo inválido'),
  telefono: z.string().min(1, 'Teléfono requerido'),
  direccion: z.string().min(1, 'Dirección requerida'),
  ciudad: z.string().min(1, 'Ciudad requerida'),
  observaciones: z.string().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { empresa: { contains: search, mode: 'insensitive' as const } },
            { rut: { contains: search } },
            { correo: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { quotations: true, contracts: true } } },
    });
    res.json(clients);
  } catch {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        quotations: { include: { details: { include: { service: true } } }, orderBy: { createdAt: 'desc' } },
        contracts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: { ...data, createdBy: req.user!.userId },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'CREAR', entidad: 'Client', entidadId: client.id, detalle: `Cliente ${client.name} creado`, ip: req.ip },
    });
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'EDITAR', entidad: 'Client', entidadId: client.id, detalle: `Cliente ${client.name} editado`, ip: req.ip },
    });
    res.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'ELIMINAR', entidad: 'Client', entidadId: parseInt(req.params.id), detalle: `Cliente ID ${req.params.id} eliminado`, ip: req.ip },
    });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
