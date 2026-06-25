import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Download, Trash2, Plus, ArrowLeft, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Client, Service, Quotation } from '../../types';

interface LineItem {
  servicioId: number;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

export default function QuotationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [clienteId, setClienteId] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [estado, setEstado] = useState('BORRADOR');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: clients } = useQuery({ queryKey: ['clients-select'], queryFn: () => api.get('/clients').then(r => r.data) });
  const { data: services } = useQuery({ queryKey: ['services-select'], queryFn: () => api.get('/services', { params: { activo: 'true' } }).then(r => r.data) });

  const { data: existing } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.get(`/quotations/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setClienteId(String(existing.clienteId));
      setFechaVencimiento(existing.fechaVencimiento.split('T')[0]);
      setEstado(existing.estado);
      setObservaciones(existing.observaciones || '');
      if (existing.details) {
        setItems(existing.details.map((d: any) => ({
          servicioId: d.servicioId,
          descripcion: d.descripcion || d.service?.name || '',
          cantidad: d.cantidad,
          valorUnitario: Number(d.valorUnitario),
          subtotal: Number(d.subtotal),
        })));
      }
    }
  }, [existing]);

  useEffect(() => {
    if (!fechaVencimiento) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      setFechaVencimiento(d.toISOString().split('T')[0]);
    }
  }, []);

  function addItem() {
    setItems([...items, { servicioId: 0, descripcion: '', cantidad: 1, valorUnitario: 0, subtotal: 0 }]);
  }

  function updateItem(index: number, field: keyof LineItem, value: any) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'servicioId' && services) {
      const svc = services.find((s: Service) => s.id === value);
      if (svc) { newItems[index].descripcion = svc.name; newItems[index].valorUnitario = Number(svc.valorBase); }
    }
    newItems[index].subtotal = newItems[index].cantidad * newItems[index].valorUnitario;
    setItems(newItems);
  }

  function removeItem(index: number) { setItems(items.filter((_, i) => i !== index)); }

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const createMutation = useMutation({
    mutationFn: (data: any) => isEdit ? api.put(`/quotations/${id}`, data) : api.post('/quotations', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(isEdit ? 'Cotización actualizada' : 'Cotización creada');
      navigate(`/cotizaciones/${res.data.id}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => api.put(`/quotations/${id}/status`, { estado: newStatus }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); queryClient.invalidateQueries({ queryKey: ['quotation', id] }); toast.success('Estado actualizado'); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) return toast.error('Seleccione un cliente');
    if (items.length === 0) return toast.error('Agregue al menos un servicio');
    if (items.some(i => !i.servicioId)) return toast.error('Complete todos los servicios');
    createMutation.mutate({
      clienteId: Number(clienteId), fechaVencimiento, estado, observaciones,
      details: items.map(i => ({ servicioId: i.servicioId, descripcion: i.descripcion, cantidad: i.cantidad, valorUnitario: i.valorUnitario })),
    });
  }

  const handleDownloadPdf = async () => {
    if (!id) return;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/cotizaciones')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? `Cotización ${existing?.correlativo || ''}` : 'Nueva Cotización'}</h1>
            <p className="page-subtitle">{isEdit ? 'Editar cotización existente' : 'Crear nueva cotización para cliente'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isEdit && (
            <>
              <button onClick={handleDownloadPdf} className="btn-secondary"><Download className="w-4 h-4" /> PDF</button>
              {['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA'].map((s) => estado !== s && (
                <button key={s} onClick={() => { if (id) statusMutation.mutate(s); }} className="btn-secondary text-xs px-3 py-1.5">{s === 'ENVIADA' ? 'Marcar Enviada' : s === 'ACEPTADA' ? 'Aceptar' : s === 'RECHAZADA' ? 'Rechazar' : 'Borrador'}</button>
              ))}
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header"><h2 className="section-title">Información General</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select className="select-field" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                  <option value="">Seleccionar cliente...</option>
                  {clients?.map((c: Client) => <option key={c.id} value={c.id}>{c.name} - {c.empresa}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                <input type="date" className="input-field" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select className="select-field" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="ENVIADA">Enviada</option>
                  <option value="ACEPTADA">Aceptada</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="section-title">Servicios</h2>
            <button type="button" onClick={addItem} className="btn-secondary text-xs px-3 py-1.5"><Plus className="w-3 h-3" /> Agregar Servicio</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Servicio</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Descripción</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase text-center w-20">Cant.</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase text-right w-32">Valor Unit.</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase text-right w-32">Subtotal</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <select className="select-field text-xs" value={item.servicioId} onChange={(e) => updateItem(i, 'servicioId', Number(e.target.value))} required>
                        <option value={0}>Seleccionar...</option>
                        {services?.map((s: Service) => <option key={s.id} value={s.id}>{s.name} - ${Number(s.valorBase).toLocaleString('es-CL')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input className="input-field text-xs" value={item.descripcion} onChange={(e) => updateItem(i, 'descripcion', e.target.value)} /></td>
                    <td className="px-4 py-3"><input type="number" className="input-field text-xs text-center" min={1} value={item.cantidad} onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))} required /></td>
                    <td className="px-4 py-3"><input type="number" className="input-field text-xs text-right" min={0} value={item.valorUnitario} onChange={(e) => updateItem(i, 'valorUnitario', Number(e.target.value))} required /></td>
                    <td className="px-4 py-3 text-right font-medium">${item.subtotal.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay servicios agregados. Haga clic en "Agregar Servicio".</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card-body border-t border-gray-100">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal:</span><span className="font-medium">${subtotal.toLocaleString('es-CL')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">IVA 19%:</span><span className="font-medium">${iva.toLocaleString('es-CL')}</span></div>
              <div className="flex justify-between text-lg font-bold text-primary-800 border-t border-gray-200 pt-2"><span>Total:</span><span>${total.toLocaleString('es-CL')}</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="section-title">Observaciones</h2></div>
          <div className="card-body">
            <textarea className="input-field" rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas o condiciones adicionales..." />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/cotizaciones')} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            <Save className="w-4 h-4" /> {createMutation.isPending ? 'Guardando...' : (isEdit ? 'Actualizar Cotización' : 'Crear Cotización')}
          </button>
        </div>
      </form>
    </div>
  );
}
