import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalQuotations,
      acceptedQuotations,
      totalContracts,
      totalClients,
      activeContracts,
      monthlyQuotations,
      recentQuotations,
      recentContracts,
      statusCounts,
    ] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { estado: 'ACEPTADA' } }),
      prisma.contract.count(),
      prisma.client.count(),
      prisma.contract.count({ where: { estado: 'ACTIVO' } }),
      prisma.quotation.findMany({
        where: { createdAt: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }).then(rows => {
        const grouped: Record<string, { count: number; amount: number }> = {};
        rows.forEach(r => {
          const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
          if (!grouped[key]) grouped[key] = { count: 0, amount: 0 };
          grouped[key].count++;
          grouped[key].amount += Number(r.total);
        });
        return Object.entries(grouped).map(([month, data]) => ({ month, count: data.count, amount: data.amount }));
      }),
      prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      prisma.contract.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      prisma.quotation.groupBy({ by: ['estado'], _count: true }),
    ]);

    const totalQuoted = await prisma.quotation.aggregate({ _sum: { total: true } });
    const totalSold = await prisma.quotation.aggregate({
      _sum: { total: true },
      where: { estado: 'ACEPTADA' },
    });

    res.json({
      totalQuotations,
      acceptedQuotations,
      totalContracts,
      totalClients,
      activeContracts,
      totalQuoted: totalQuoted._sum.total || 0,
      totalSold: totalSold._sum.total || 0,
      monthlyQuotations,
      recentQuotations,
      recentContracts,
      statusCounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

export default router;
