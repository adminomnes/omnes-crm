import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: 28800 } // 8 hours in seconds
    );
    await prisma.auditLog.create({
      data: { userId: user.id, accion: 'INICIO_SESION', entidad: 'User', detalle: `Usuario ${user.email} inició sesión`, ip: req.ip },
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

router.post('/register', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
      email: z.string().email('Correo inválido'),
      password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
      role: z.enum(['ADMIN', 'EJECUTIVO', 'GERENCIA']).default('EJECUTIVO'),
    });
    const data = schema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(400).json({ error: 'El correo ya está registrado' });
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed, role: data.role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

export default router;
