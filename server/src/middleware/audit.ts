import { Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types';

export const logAudit = (accion: string, entidad: string, getEntidadId?: (req: AuthRequest) => number | null) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode < 400) {
        const entidadId = getEntidadId ? getEntidadId(req) : (req.params.id ? parseInt(req.params.id) : null);
        prisma.auditLog.create({
          data: {
            userId: req.user?.userId,
            accion,
            entidad,
            entidadId,
            detalle: JSON.stringify({ method: req.method, path: req.path, body: req.method === 'GET' ? undefined : req.body }),
            ip: req.ip,
          },
        }).catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
};
