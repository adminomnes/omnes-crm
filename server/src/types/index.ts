import { Request } from 'express';

export type UserRole = 'ADMIN' | 'EJECUTIVO' | 'GERENCIA';

export interface JwtPayload {
  userId: number;
  role: UserRole;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
