import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roles';
import { AuthRequest } from '../types';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const router = Router();

async function generarCorrelativoContrato(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { correlativo: { startsWith: `CON-${year}-` } },
  });
  return `CON-${year}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = parseInt(req.query.clienteId as string);
    if (req.query.search) {
      where.OR = [
        { correlativo: { contains: req.query.search as string } },
        { client: { name: { contains: req.query.search as string, mode: 'insensitive' as const } } },
      ];
    }
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, empresa: true, rut: true } },
        quotation: { select: { correlativo: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contracts);
  } catch {
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        quotation: { include: { details: { include: { service: true } } } },
        user: { select: { id: true, name: true } },
        documents: true,
      },
    });
    if (!contract) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(contract);
  } catch {
    res.status(500).json({ error: 'Error al obtener contrato' });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      quotationId: z.number(),
      tipo: z.enum(['PRESTACION_SERVICIOS', 'DESARROLLO_SOFTWARE', 'MARKETING_DIGITAL', 'CONSULTORIA', 'PERSONALIZADA']).default('PRESTACION_SERVICIOS'),
      fechaInicio: z.string().min(1),
      fechaTermino: z.string().optional(),
      condiciones: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      include: { client: true, details: { include: { service: true } } },
    });
    if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (quotation.estado !== 'ACEPTADA') return res.status(400).json({ error: 'La cotización debe estar en estado ACEPTADA' });
    const correlativo = await generarCorrelativoContrato();

    let contratoTexto = `CONTRATO DE ${data.tipo.replace('_', ' ')}\n\n`;
    contratoTexto += `Conste por el presente documento de contrato de prestación de servicios, que celebran:\n\n`;
    contratoTexto += `PRESTADOR: ${quotation.client.name}, RUT: ${quotation.client.rut}\n`;
    contratoTexto += `CLIENTE: ${quotation.client.empresa}, representada por ${quotation.client.name}\n\n`;
    contratoTexto += `SERVICIOS CONTRATADOS:\n`;
    quotation.details.forEach((d, i) => {
      contratoTexto += `${i+1}. ${d.service?.name || d.descripcion} - $${Number(d.subtotal).toLocaleString('es-CL')}\n`;
    });
    contratoTexto += `\nValor Total: $${Number(quotation.total).toLocaleString('es-CL')}\n`;
    contratoTexto += `\nCondiciones: ${data.condiciones || 'Las partes acuerdan los términos y condiciones estándar.'}\n`;

    const contract = await prisma.contract.create({
      data: {
        correlativo,
        quotationId: data.quotationId,
        clienteId: quotation.clienteId,
        userId: req.user!.userId,
        tipo: data.tipo as any,
        fechaInicio: new Date(data.fechaInicio),
        fechaTermino: data.fechaTermino ? new Date(data.fechaTermino) : null,
        valorTotal: quotation.total,
        condiciones: data.condiciones,
        contratoTexto,
        estado: 'ACTIVO',
      },
      include: { client: true, quotation: true },
    });
    await prisma.quotation.update({ where: { id: data.quotationId }, data: { estado: 'ACEPTADA' } });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, accion: 'CREAR', entidad: 'Contract', entidadId: contract.id, detalle: `Contrato ${correlativo} creado desde cotización ${quotation.correlativo}`, ip: req.ip },
    });
    res.status(201).json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear contrato' });
  }
});

router.put('/:id', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      tipo: z.enum(['PRESTACION_SERVICIOS', 'DESARROLLO_SOFTWARE', 'MARKETING_DIGITAL', 'CONSULTORIA', 'PERSONALIZADA']).optional(),
      fechaInicio: z.string().optional(),
      fechaTermino: z.string().nullable().optional(),
      condiciones: z.string().optional(),
      estado: z.enum(['BORRADOR', 'ACTIVO', 'FINALIZADO', 'RESCINDIDO']).optional(),
    });
    const data = schema.parse(req.body);
    const updateData: any = {};
    if (data.tipo) updateData.tipo = data.tipo;
    if (data.fechaInicio) updateData.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaTermino !== undefined) updateData.fechaTermino = data.fechaTermino ? new Date(data.fechaTermino) : null;
    if (data.condiciones !== undefined) updateData.condiciones = data.condiciones;
    if (data.estado) { updateData.estado = data.estado; updateData.version = { increment: 1 }; }
    const contract = await prisma.contract.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { client: true, quotation: true },
    });
    res.json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar contrato' });
  }
});

router.put('/:id/status', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = z.object({ estado: z.enum(['BORRADOR', 'ACTIVO', 'FINALIZADO', 'RESCINDIDO']) }).parse(req.body);
    const contract = await prisma.contract.update({
      where: { id: parseInt(req.params.id) },
      data: { estado, version: { increment: 1 } },
    });
    res.json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { client: true, quotation: { include: { details: { include: { service: true } } } }, user: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contrato no encontrado' });
    const config = await prisma.companyConfig.findFirst({ include: { legalRepresentative: true } });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${contract.correlativo}.pdf"`);
    doc.pipe(res);

    const primaryColor = '#1e40af';

    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
    const logoPath = path.join(__dirname, '../../uploads/logo-omnes.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 5, { width: 110 });
    }
    doc.fill('#ffffff').fontSize(10).font('Helvetica').text(`RUT: ${config?.rut || ''} | ${config?.direccion || ''}`, 50, 60);
    doc.text(`Tel: ${config?.telefono || ''} | ${config?.correo || ''}`, 50, 75);

    doc.fontSize(16).font('Helvetica-Bold').fill('#ffffff').text('CONTRATO', doc.page.width - 200, 30, { width: 150, align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`N° ${contract.correlativo}`, doc.page.width - 200, 55, { width: 150, align: 'right' });
    doc.text(`Versión: ${contract.version}`, doc.page.width - 200, 70, { width: 150, align: 'right' });

    doc.y = 150;
    doc.x = 50;
    doc.fill('#111827').fontSize(11).font('Helvetica-Bold').text('CONTRATO DE PRESTACIÓN DE SERVICIOS', 50, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fill('#374151');
    doc.x = 50;

    const lines = contract.contratoTexto?.split('\n') || [];
    lines.forEach(line => {
      if (doc.y > 700) { doc.addPage(); doc.y = 40; doc.x = 50; }
      doc.text(line, 50, doc.y);
      doc.moveDown(0.3);
      doc.x = 50;
    });

    const footerY = doc.page.height - 120;
    doc.rect(50, footerY - 10, doc.page.width - 100, 1).fill('#d1d5db');
    doc.fontSize(9).font('Helvetica').fill('#374151');
    doc.text('FIRMA PRESTADOR', 50, footerY + 5);
    doc.text('____________________________', 50, footerY + 20);
    doc.text(config?.legalRepresentative?.nombreCompleto || '', 50, footerY + 35);
    doc.text(config?.legalRepresentative?.cargo || 'Representante Legal', 50, footerY + 48);

    doc.text('FIRMA CLIENTE', doc.page.width - 200, footerY + 5);
    doc.text('____________________________', doc.page.width - 200, footerY + 20);
    doc.text(contract.client.name, doc.page.width - 200, footerY + 35);
    doc.text(contract.client.empresa, doc.page.width - 200, footerY + 48);

    if (config?.piePagina) {
      doc.y = doc.page.height - 40;
      doc.fontSize(8).fill('#9ca3af').text(config.piePagina, 50, doc.y, { align: 'center', width: doc.page.width - 100 });
    }

    doc.end();
  } catch {
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

router.get('/templates/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.contractTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

router.post('/templates', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      tipo: z.enum(['PRESTACION_SERVICIOS', 'DESARROLLO_SOFTWARE', 'MARKETING_DIGITAL', 'CONSULTORIA', 'PERSONALIZADA']),
      contenido: z.string().min(1),
    });
    const data = schema.parse(req.body);
    const template = await prisma.contractTemplate.create({ data });
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
});

router.put('/templates/:id', authenticate, authorize('ADMIN', 'GERENCIA'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      contenido: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const template = await prisma.contractTemplate.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(template);
  } catch {
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
});

export default router;
