export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'EJECUTIVO' | 'GERENCIA';
  active?: boolean;
  createdAt?: string;
}

export interface CompanyConfig {
  id: number;
  razonSocial: string;
  nombreComercial: string;
  rut: string;
  giroComercial: string;
  direccion: string;
  ciudad: string;
  pais: string;
  telefono: string;
  correo: string;
  sitioWeb: string;
  logoPrincipal?: string;
  logoSecundario?: string;
  colores?: string;
  firmaDigital?: string;
  piePagina?: string;
  legalRepresentative?: LegalRepresentative;
}

export interface LegalRepresentative {
  id: number;
  nombreCompleto: string;
  rut: string;
  cargo: string;
  correo: string;
  telefono: string;
}

export interface Client {
  id: number;
  name: string;
  empresa: string;
  rut: string;
  correo: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  observaciones?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  _count?: { quotations: number; contracts: number };
  quotations?: Quotation[];
  contracts?: Contract[];
}

export interface Service {
  id: number;
  name: string;
  categoria: string;
  descripcion?: string;
  valorBase: number;
  impuesto: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA';

export interface Quotation {
  id: number;
  correlativo: string;
  fechaEmision: string;
  fechaVencimiento: string;
  clienteId: number;
  userId: number;
  estado: QuotationStatus;
  subtotal: number;
  iva: number;
  total: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  user?: User;
  details?: QuotationDetail[];
  contract?: Contract;
}

export interface QuotationDetail {
  id: number;
  quotationId: number;
  servicioId: number;
  descripcion?: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
  service?: Service;
}

export type ContractType = 'PRESTACION_SERVICIOS' | 'DESARROLLO_SOFTWARE' | 'MARKETING_DIGITAL' | 'CONSULTORIA' | 'PERSONALIZADA';
export type ContractStatus = 'BORRADOR' | 'ACTIVO' | 'FINALIZADO' | 'RESCINDIDO';

export interface Contract {
  id: number;
  correlativo: string;
  quotationId: number;
  clienteId: number;
  userId: number;
  tipo: ContractType;
  fechaInicio: string;
  fechaTermino?: string;
  valorTotal: number;
  estado: ContractStatus;
  condiciones?: string;
  contratoTexto?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  quotation?: Quotation;
  user?: User;
  documents?: Document[];
}

export interface ContractTemplate {
  id: number;
  name: string;
  tipo: ContractType;
  contenido: string;
  createdAt: string;
}

export interface Document {
  id: number;
  name: string;
  tipo: string;
  clienteId?: number;
  quotationId?: number;
  contractId?: number;
  filePath: string;
  userId: number;
  createdAt: string;
  client?: { id: number; name: string };
  quotation?: { id: number; correlativo: string };
  contract?: { id: number; correlativo: string };
  user?: { id: number; name: string };
}

export interface AuditLog {
  id: number;
  userId?: number;
  accion: string;
  entidad: string;
  entidadId?: number;
  detalle?: string;
  ip?: string;
  createdAt: string;
  user?: { id: number; name: string; email: string };
}

export interface DashboardData {
  totalQuotations: number;
  acceptedQuotations: number;
  totalContracts: number;
  totalClients: number;
  activeContracts: number;
  totalQuoted: number;
  totalSold: number;
  monthlyQuotations: Array<{ month: Date; count: bigint; amount: bigint }>;
  recentQuotations: Quotation[];
  recentContracts: Contract[];
  statusCounts: Array<{ estado: QuotationStatus; _count: number }>;
}
