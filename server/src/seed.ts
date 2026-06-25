import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos OMNES...');

  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@omnes.cl' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@omnes.cl',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
      },
    });
    console.log('✅ Usuario admin creado: admin@omnes.cl / admin123');
  }

  const ejecutivoExists = await prisma.user.findUnique({ where: { email: 'ejecutivo@omnes.cl' } });
  if (!ejecutivoExists) {
    await prisma.user.create({
      data: {
        name: 'Ejecutivo Comercial',
        email: 'ejecutivo@omnes.cl',
        password: await bcrypt.hash('ejecutivo123', 10),
        role: 'EJECUTIVO',
      },
    });
    console.log('✅ Usuario ejecutivo creado: ejecutivo@omnes.cl / ejecutivo123');
  }

  const configExists = await prisma.companyConfig.findFirst();
  if (!configExists) {
    await prisma.companyConfig.create({
      data: {
        razonSocial: 'OMNES Holding SpA',
        nombreComercial: 'OMNES',
        rut: '76.123.456-7',
        giroComercial: 'Servicios de Tecnología y Consultoría',
        direccion: 'Av. Apoquindo 4900, Piso 8',
        ciudad: 'Santiago',
        pais: 'Chile',
        telefono: '+56 2 2345 6789',
        correo: 'contacto@omnes.cl',
        sitioWeb: 'https://omnes.cl',
        colores: JSON.stringify({ primary: '#1e40af', secondary: '#f3f4f6', accent: '#10b981' }),
        piePagina: 'OMNES Holding SpA - Todos los derechos reservados',
        legalRepresentative: {
          create: {
            nombreCompleto: 'Juan Carlos Martínez',
            rut: '12.345.678-9',
            cargo: 'Gerente General',
            correo: 'jcmartinez@omnes.cl',
            telefono: '+56 9 9876 5432',
          },
        },
      },
    });
    console.log('✅ Configuración corporativa creada');
  }

  const templates = await prisma.contractTemplate.count();
  if (templates === 0) {
    await prisma.contractTemplate.createMany({
      data: [
        { name: 'Prestación de Servicios Profesionales', tipo: 'PRESTACION_SERVICIOS', contenido: 'Plantilla estándar para prestación de servicios profesionales.' },
        { name: 'Desarrollo de Software a Medida', tipo: 'DESARROLLO_SOFTWARE', contenido: 'Plantilla para proyectos de desarrollo de software.' },
        { name: 'Marketing Digital y Publicidad', tipo: 'MARKETING_DIGITAL', contenido: 'Plantilla para campañas de marketing digital.' },
        { name: 'Consultoría Empresarial', tipo: 'CONSULTORIA', contenido: 'Plantilla para servicios de consultoría.' },
        { name: 'Contrato Personalizado', tipo: 'PERSONALIZADA', contenido: 'Plantilla de contrato personalizable.' },
      ],
    });
    console.log('✅ Plantillas de contrato creadas');
  }

  console.log('✅ Base de datos lista!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
