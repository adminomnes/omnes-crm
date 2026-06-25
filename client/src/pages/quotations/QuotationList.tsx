import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Copy, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Quotation } from '../../types';

const statusLabels: Record<string, string> = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida',
};
const statusBadges: Record<string, string> = {
  BORRADOR: 'badge-gray', ENVIADA: 'badge-blue', ACEPTADA: 'badge-green', RECHAZADA: 'badge-red', VENCIDA: 'badge-yellow',
};

export default function QuotationList() {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations', search, filterEstado],
    queryFn: () => api.get('/quotations', { params: { search, estado: filterEstado || undefined } }).then(r => r.data),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/quotations/${id}/duplicate`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Cotización duplicada'); },
  });

  const handleDownloadPdf = async (id: number) => {
    try {
      const token = localStorage.getItem('omnes_token');
      const response = await fetch(`/api/quotations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar PDF');
    }
  };

  const statuses = ['', 'BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Cotizaciones</h1><p className="page-subtitle">Gestión de cotizaciones OMNES</p></div>
        <Link to="/cotizaciones/nueva" className="btn-primary"><Plus className="w-4 h-4" /> Nueva Cotización</Link>
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
              {statuses.filter(Boolean).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">N°</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Fecha</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Total</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Creado por</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" /></td></tr>)
              ) : quotations?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No se encontraron cotizaciones
                </td></tr>
              ) : quotations?.map((q: Quotation) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">{q.correlativo}</td>
                  <td className="px-4 py-4 text-gray-500">{new Date(q.fechaEmision).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-4">{q.client?.name}</td>
                  <td className="px-4 py-4 font-medium">${Number(q.total).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-4"><span className={statusBadges[q.estado]}>{statusLabels[q.estado]}</span></td>
                  <td className="px-4 py-4 text-gray-500">{q.user?.name}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link to={`/cotizaciones/${q.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Ver"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => duplicateMutation.mutate(q.id)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDownloadPdf(q.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Descargar PDF"><Download className="w-4 h-4" /></button>
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
