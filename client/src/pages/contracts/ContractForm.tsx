import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Download, ArrowLeft, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Quotation, Contract } from '../../types';

const tipoOptions = [
  { value: 'PRESTACION_SERVICIOS', label: 'Prestación de Servicios' },
  { value: 'DESARROLLO_SOFTWARE', label: 'Desarrollo de Software' },
  { value: 'MARKETING_DIGITAL', label: 'Marketing Digital' },
  { value: 'CONSULTORIA', label: 'Consultoría' },
  { value: 'PERSONALIZADA', label: 'Personalizada' },
];

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [quotationId, setQuotationId] = useState('');
  const [tipo, setTipo] = useState('PRESTACION_SERVICIOS');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaTermino, setFechaTermino] = useState('');
  const [condiciones, setCondiciones] = useState('');

  const { data: acceptedQuotations } = useQuery({
    queryKey: ['quotations-accepted'],
    queryFn: () => api.get('/quotations', { params: { estado: 'ACEPTADA' } }).then(r => r.data),
    enabled: !isEdit,
  });

  const { data: contract } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => api.get(`/contracts/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: quotationData } = useQuery({
    queryKey: ['quotation-for-contract', quotationId],
    queryFn: () => api.get(`/quotations/${quotationId}`).then(r => r.data),
    enabled: !!quotationId,
  });

  useEffect(() => {
    if (contract) {
      setQuotationId(String(contract.quotationId));
      setTipo(contract.tipo);
      setFechaInicio(contract.fechaInicio?.split('T')[0] || '');
      setFechaTermino(contract.fechaTermino?.split('T')[0] || '');
      setCondiciones(contract.condiciones || '');
    }
  }, [contract]);

  useEffect(() => {
    if (!fechaInicio) {
      setFechaInicio(new Date().toISOString().split('T')[0]);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contracts', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato creado');
      navigate(`/contratos/${res.data.id}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => api.put(`/contracts/${id}/status`, { estado }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contracts'] }); queryClient.invalidateQueries({ queryKey: ['contract', id] }); toast.success('Estado actualizado'); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quotationId) return toast.error('Seleccione una cotización aceptada');
    createMutation.mutate({
      quotationId: Number(quotationId), tipo, fechaInicio, fechaTermino: fechaTermino || undefined, condiciones,
    });
  }

  const handleDownloadPdf = async () => {
    if (!id) return;
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

  if (isEdit && !contract) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="card p-6"><div className="h-64 bg-gray-100 rounded-lg" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/contratos')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? `Contrato ${contract?.correlativo || ''}` : 'Nuevo Contrato'}</h1>
            <p className="page-subtitle">{isEdit ? 'Detalle del contrato' : 'Crear contrato desde cotización aceptada'}</p>
          </div>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} className="btn-secondary"><Download className="w-4 h-4" /> PDF</button>
            {['ACTIVO', 'FINALIZADO', 'RESCINDIDO'].map((s) => contract?.estado !== s && (
              <button key={s} onClick={() => statusMutation.mutate({ id: contract!.id, estado: s })} className={`btn-${s === 'ACTIVO' ? 'success' : s === 'FINALIZADO' ? 'primary' : 'danger'} text-xs px-3 py-1.5`}>
                {s === 'ACTIVO' ? 'Activar' : s === 'FINALIZADO' ? 'Finalizar' : 'Rescindir'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isEdit ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header"><h2 className="section-title">Datos del Contrato</h2></div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cotización Aceptada</label>
                  <select className="select-field" value={quotationId} onChange={(e) => setQuotationId(e.target.value)} required>
                    <option value="">Seleccionar cotización...</option>
                    {acceptedQuotations?.map((q: Quotation) => (
                      <option key={q.id} value={q.id}>{q.correlativo} - {q.client?.name} - ${Number(q.total).toLocaleString('es-CL')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
                  <select className="select-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {tipoOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                  <input type="date" className="input-field" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Término</label>
                  <input type="date" className="input-field" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones</label>
                  <textarea className="input-field" rows={4} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Términos y condiciones del contrato..." />
                </div>
              </div>
            </div>
          </div>

          {quotationData && (
            <div className="card">
              <div className="card-header"><h2 className="section-title">Vista Previa de Cotización</h2></div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{quotationData.client?.name}</span></div>
                  <div><span className="text-gray-500">Empresa:</span> <span className="font-medium">{quotationData.client?.empresa}</span></div>
                  <div><span className="text-gray-500">RUT:</span> <span className="font-medium">{quotationData.client?.rut}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="font-medium">${Number(quotationData.total).toLocaleString('es-CL')}</span></div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-500 text-xs uppercase">Servicio</th>
                      <th className="px-3 py-2 font-medium text-gray-500 text-xs uppercase">Cant.</th>
                      <th className="px-3 py-2 font-medium text-gray-500 text-xs uppercase">Valor Unit.</th>
                      <th className="px-3 py-2 font-medium text-gray-500 text-xs uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotationData.details?.map((d: any) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2">{d.service?.name || d.descripcion}</td>
                        <td className="px-3 py-2">{d.cantidad}</td>
                        <td className="px-3 py-2">${Number(d.valorUnitario).toLocaleString('es-CL')}</td>
                        <td className="px-3 py-2">${Number(d.subtotal).toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            <Save className="w-4 h-4" /> {createMutation.isPending ? 'Creando...' : 'Crear Contrato'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card card-body"><span className="text-xs text-gray-500 block">N° Contrato</span><span className="font-semibold">{contract?.correlativo}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Tipo</span><span className="font-semibold">{tipoOptions.find(t => t.value === contract?.tipo)?.label || contract?.tipo}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Versión</span><span className="font-semibold">{contract?.version}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Cliente</span><span className="font-semibold">{contract?.client?.name}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Empresa</span><span className="font-semibold">{contract?.client?.empresa}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">RUT Cliente</span><span className="font-semibold">{contract?.client?.rut}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Fecha Inicio</span><span className="font-semibold">{contract?.fechaInicio ? new Date(contract.fechaInicio).toLocaleDateString('es-CL') : '-'}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Fecha Término</span><span className="font-semibold">{contract?.fechaTermino ? new Date(contract.fechaTermino).toLocaleDateString('es-CL') : 'Indefinido'}</span></div>
            <div className="card card-body"><span className="text-xs text-gray-500 block">Valor Total</span><span className="font-semibold text-lg text-primary-800">${Number(contract?.valorTotal || 0).toLocaleString('es-CL')}</span></div>
          </div>

          {contract?.condiciones && (
            <div className="card">
              <div className="card-header"><h2 className="section-title">Condiciones</h2></div>
              <div className="card-body"><p className="text-sm text-gray-600 whitespace-pre-wrap">{contract.condiciones}</p></div>
            </div>
          )}

          {contract?.contratoTexto && (
            <div className="card">
              <div className="card-header"><h2 className="section-title">Texto del Contrato</h2></div>
              <div className="card-body"><p className="text-sm text-gray-600 whitespace-pre-wrap font-mono">{contract.contratoTexto}</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
