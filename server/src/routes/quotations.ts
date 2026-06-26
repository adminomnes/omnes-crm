import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma, UPLOADS_PATH } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const router = Router();

async function generarCorrelativo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: { correlativo: { startsWith: `COT-${year}-` } },
  });
  return `COT-${year}-${String(count + 1).padStart(4, '0')}`;
}

const quotationSchema = z.object({
  clienteId: z.number(),
  fechaVencimiento: z.string().min(1),
  estado: z.enum(['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA']).default('BORRADOR'),
  observaciones: z.string().optional(),
  details: z.array(z.object({
    servicioId: z.number(),
    descripcion: z.string().optional(),
    cantidad: z.number().int().min(1),
    valorUnitario: z.number().min(0),
  })).min(1, 'Debe agregar al menos un servicio'),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = parseInt(req.query.clienteId as string);
    if (req.query.desde) where.fechaEmision = { ...where.fechaEmision, gte: new Date(req.query.desde as string) };
    if (req.query.hasta) where.fechaEmision = { ...where.fechaEmision, lte: new Date(req.query.hasta as string) };
    if (req.query.search) {
      where.OR = [
        { correlativo: { contains: req.query.search as string } },
        { client: { name: { contains: req.query.search as string, mode: 'insensitive' as const } } },
      ];
    }
    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, empresa: true, rut: true } },
        user: { select: { id: true, name: true } },
        details: { include: { service: { select: { id: true, name: true, categoria: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotations);
  } catch {
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        user: { select: { id: true, name: true, email: true } },
        details: { include: { service: true } },
        contract: true,
      },
    });
    if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(quotation);
  } catch {
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = quotationSchema.parse(req.body);
    const correlativo = await generarCorrelativo();
    let subtotal = 0;
    const detailsData = data.details.map(d => {
      const st = d.cantidad * d.valorUnitario;
      subtotal += st;
      return { servicioId: d.servicioId, descripcion: d.descripcion, cantidad: d.cantidad, valorUnitario: d.valorUnitario, subtotal: st };
    });
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const quotation = await prisma.quotation.create({
      data: {
        correlativo,
        fechaVencimiento: new Date(data.fechaVencimiento),
        clienteId: data.clienteId,
        userId: req.user!.userId,
        estado: data.estado as any,
        subtotal,
        iva,
        total,
        observaciones: data.observaciones,
        details: { createMany: { data: detailsData } },
      },
      include: { client: true, details: { include: { service: true } } },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'CREAR', entidad: 'Quotation', entidadId: quotation.id, detalle: `Cotización ${correlativo} creada`, ip: req.ip },
    });
    res.status(201).json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = quotationSchema.partial().parse(req.body);
    const updateData: any = {};
    if (data.fechaVencimiento) updateData.fechaVencimiento = new Date(data.fechaVencimiento);
    if (data.estado) updateData.estado = data.estado;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.details) {
      let subtotal = 0;
      const detailsData = data.details.map(d => {
        const st = d.cantidad * d.valorUnitario;
        subtotal += st;
        return { servicioId: d.servicioId, descripcion: d.descripcion, cantidad: d.cantidad, valorUnitario: d.valorUnitario, subtotal: st };
      });
      updateData.subtotal = subtotal;
      updateData.iva = Math.round(subtotal * 0.19);
      updateData.total = subtotal + updateData.iva;
      await prisma.quotationDetail.deleteMany({ where: { quotationId: parseInt(req.params.id) } });
      await prisma.quotationDetail.createMany({ data: detailsData.map(d => ({ ...d, quotationId: parseInt(req.params.id) })) });
    }
    const quotation = await prisma.quotation.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { client: true, details: { include: { service: true } } },
    });
    res.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = z.object({ estado: z.enum(['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA']) }).parse(req.body);
    const quotation = await prisma.quotation.update({
      where: { id: parseInt(req.params.id) },
      data: { estado },
      include: { client: true, details: { include: { service: true } } },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'CAMBIAR_ESTADO', entidad: 'Quotation', entidadId: quotation.id, detalle: `Cotización ${quotation.correlativo} cambió a ${estado}`, ip: req.ip },
    });
    res.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const original = await prisma.quotation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { details: true },
    });
    if (!original) return res.status(404).json({ error: 'Cotización no encontrada' });
    const correlativo = await generarCorrelativo();
    const quotation = await prisma.quotation.create({
      data: {
        correlativo,
        fechaVencimiento: original.fechaVencimiento,
        clienteId: original.clienteId,
        userId: req.user!.userId,
        estado: 'BORRADOR',
        subtotal: original.subtotal,
        iva: original.iva,
        total: original.total,
        observaciones: original.observaciones,
        details: { createMany: { data: original.details.map(d => ({
          servicioId: d.servicioId, descripcion: d.descripcion, cantidad: d.cantidad, valorUnitario: d.valorUnitario, subtotal: d.subtotal,
        })) } },
      },
      include: { client: true, details: { include: { service: true } } },
    });
    res.status(201).json(quotation);
  } catch {
    res.status(500).json({ error: 'Error al duplicar cotización' });
  }
});

router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { client: true, user: true, details: { include: { service: true } } },
    });
    if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
    const config = await prisma.companyConfig.findFirst({ include: { legalRepresentative: true } });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="cotizacion-${quotation.correlativo}.pdf"`);
    doc.pipe(res);

    const primaryColor = '#1e40af';
    const secondaryColor = '#f3f4f6';

    doc.rect(0, 0, doc.page.width, 140).fill(primaryColor);
    const logoPath = path.join(UPLOADS_PATH, 'logo-omnes.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 8, { width: 120 });
    }
    doc.fill('#ffffff').fontSize(10).font('Helvetica').text(`RUT: ${config?.rut || ''}`, 40, 60);
    doc.text(`${config?.direccion || ''}, ${config?.ciudad || ''}`, 40, 75);
    doc.text(`Tel: ${config?.telefono || ''} | ${config?.correo || ''}`, 40, 90);

    doc.fontSize(18).font('Helvetica-Bold').fill(primaryColor).text('COTIZACIÓN', doc.page.width - 200, 30, { width: 170, align: 'right' });
    doc.fontSize(10).font('Helvetica').fill('#ffffff').text(`N° ${quotation.correlativo}`, doc.page.width - 200, 55, { width: 170, align: 'right' });
    doc.text(`Emisión: ${new Date(quotation.fechaEmision).toLocaleDateString('es-CL')}`, doc.page.width - 200, 70, { width: 170, align: 'right' });
    doc.text(`Vencimiento: ${new Date(quotation.fechaVencimiento).toLocaleDateString('es-CL')}`, doc.page.width - 200, 85, { width: 170, align: 'right' });
    doc.text(`Estado: ${quotation.estado}`, doc.page.width - 200, 100, { width: 170, align: 'right' });

    doc.y = 160;
    doc.fill('#111827').fontSize(12).font('Helvetica-Bold').text('CLIENTE');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fill('#374151');
    doc.text(`Nombre: ${quotation.client.name}`);
    doc.text(`Empresa: ${quotation.client.empresa}`);
    doc.text(`RUT: ${quotation.client.rut}`);
    doc.text(`Dirección: ${quotation.client.direccion}, ${quotation.client.ciudad}`);

    doc.y = 270;
    doc.fill(primaryColor).fontSize(12).font('Helvetica-Bold').text('DETALLE DE SERVICIOS');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const col1 = 40, col2 = 110, col3 = 330, col4 = 400, col5 = 470;
    doc.fontSize(9).font('Helvetica-Bold').fill('#374151');
    doc.text('#', col1, tableTop);
    doc.text('Servicio', col2, tableTop);
    doc.text('Cant.', col3, tableTop);
    doc.text('Valor Unit.', col4, tableTop);
    doc.text('Subtotal', col5, tableTop);
    doc.moveDown(0.5);
    let rowY = doc.y;
    doc.fontSize(9).font('Helvetica').fill('#111827');
    quotation.details.forEach((d, i) => {
      if (rowY > 650) { doc.addPage(); rowY = 40; }
      doc.fill('#111827').text(String(i + 1), col1, rowY);
      doc.text(d.service?.name || d.descripcion || '', col2, rowY, { width: 210 });
      doc.text(String(d.cantidad), col3, rowY);
      doc.text(`$${Number(d.valorUnitario).toLocaleString('es-CL')}`, col4, rowY);
      doc.text(`$${Number(d.subtotal).toLocaleString('es-CL')}`, col5, rowY);
      rowY += 18;
    });

    doc.rect(col1, rowY + 5, 510, 1).fill('#d1d5db');
    rowY += 15;
    doc.fontSize(10).fill('#374151');
    doc.text('Subtotal:', col4 - 30, rowY);
    doc.fontSize(10).font('Helvetica-Bold').fill('#111827').text(`$${Number(quotation.subtotal).toLocaleString('es-CL')}`, col5, rowY);
    rowY += 18;
    doc.fontSize(10).font('Helvetica').fill('#374151').text('IVA 19%:', col4 - 30, rowY);
    doc.text(`$${Number(quotation.iva).toLocaleString('es-CL')}`, col5, rowY);
    rowY += 18;
    doc.rect(col1, rowY - 3, 510, 20).fill(primaryColor);
    doc.fontSize(12).font('Helvetica-Bold').fill('#ffffff').text('TOTAL:', col4 - 30, rowY + 2);
    doc.text(`$${Number(quotation.total).toLocaleString('es-CL')}`, col5, rowY + 2);

    if (quotation.observaciones) {
      doc.y = rowY + 40;
      doc.fontSize(9).font('Helvetica').fill('#6b7280').text(`Observaciones: ${quotation.observaciones}`, 40, doc.y, { width: doc.page.width - 80, align: 'left' });
    }

    if (config?.piePagina) {
      doc.y = doc.page.height - 60;
      doc.fontSize(8).font('Helvetica').fill('#9ca3af').text(config.piePagina, 40, doc.y, { align: 'center', width: doc.page.width - 80 });
    }

    if (config?.firmaDigital) {
      doc.y = doc.page.height - 120;
      doc.fontSize(9).font('Helvetica').fill('#374151').text('Firma Autorizada', 40, doc.y);
      doc.fontSize(9).text(`${config.legalRepresentative?.nombreCompleto || ''}`, 40, doc.y + 15);
      doc.fontSize(8).fill('#6b7280').text(`${config.legalRepresentative?.cargo || ''}`, 40, doc.y + 28);
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

export default router;
