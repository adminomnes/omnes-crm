import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Eye, Download, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Contract } from '../../types';

const tipoLabels: Record<string, string> = {
  PRESTACION_SERVICIOS: 'Prestación Servicios',
  DESARROLLO_SOFTWARE: 'Desarrollo Software',
  MARKETING_DIGITAL: 'Marketing Digital',
  CONSULTORIA: 'Consultoría',
  PERSONALIZADA: 'Personalizada',
};

const estadoBadges: Record<string, string> = {
  BORRADOR: 'badge-gray', ACTIVO: 'badge-green', FINALIZADO: 'badge-blue', RESCINDIDO: 'badge-red',
};

export default function ContractList() {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', search, filterEstado],
    queryFn: () => api.get('/contracts', { params: { search, estado: filterEstado || undefined } }).then(r => r.data),
  });

  const handleDownloadPdf = async (id: number) => {
    try {
      const token = localStorage.getItem('omnes_token');
      const response = await fetch(`/api/contracts/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Contratos</h1><p className="page-subtitle">Gestión de contratos OMNES</p></div>
        <Link to="/contratos/nuevo" className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Contrato</Link>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" className="input-field pl-10" placeholder="Buscar por N° o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select-field w-auto" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVO">Activo</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="RESCINDIDO">Rescindido</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">N°</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Tipo</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cotización</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Valor Total</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Inicio</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" /></td></tr>)
              ) : contracts?.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <FileSignature className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No se encontraron contratos
                </td></tr>
              ) : contracts?.map((c: Contract) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">{c.correlativo}</td>
                  <td className="px-4 py-4"><span className="badge-blue">{tipoLabels[c.tipo] || c.tipo}</span></td>
                  <td className="px-4 py-4">{c.client?.name}</td>
                  <td className="px-4 py-4 text-gray-500">{c.quotation?.correlativo}</td>
                  <td className="px-4 py-4 font-medium">${Number(c.valorTotal).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-4"><span className={estadoBadges[c.estado]}>{c.estado}</span></td>
                  <td className="px-4 py-4 text-gray-500">{new Date(c.fechaInicio).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link to={`/contratos/${c.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Ver"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => handleDownloadPdf(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Descargar PDF"><Download className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
