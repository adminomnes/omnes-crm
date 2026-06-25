import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Client } from '../../types';
import { useAuthStore } from '../../store/authStore';

const emptyClient = { name: '', empresa: '', rut: '', correo: '', telefono: '', direccion: '', ciudad: '', observaciones: '' };

export default function ClientList() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const isGerencia = useAuthStore((s) => s.isGerencia);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.get('/clients', { params: { search } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyClient) => api.post('/clients', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente creado'); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/clients/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente actualizado'); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente eliminado'); setDeleteId(null); },
  });

  function openCreate() { setForm(emptyClient); setEditing(null); setShowModal(true); }
  function openEdit(c: Client) { setForm({ name: c.name, empresa: c.empresa, rut: c.rut, correo: c.correo, telefono: c.telefono, direccion: c.direccion, ciudad: c.ciudad, observaciones: c.observaciones || '' }); setEditing(c); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyClient); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (editing) { updateMutation.mutate({ id: editing.id, data: form }); } else { createMutation.mutate(form); } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Clientes</h1><p className="page-subtitle">Gestión de clientes OMNES</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Cliente</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Buscar por nombre, empresa, RUT o correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Nombre</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Empresa</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">RUT</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Contacto</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cotiz.</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" /></td></tr>)
              ) : clients?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No se encontraron clientes</td></tr>
              ) : clients?.map((c: Client) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span className="font-medium">{c.name}</span></div></td>
                  <td className="px-4 py-4">{c.empresa}</td>
                  <td className="px-4 py-4 text-gray-500">{c.rut}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.correo}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4"><span className="badge-gray">{c._count?.quotations || 0}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"><Edit className="w-4 h-4" /></button>
                      {(isGerencia()) && <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100"><h2 className="section-title">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Cliente</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input className="input-field" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">RUT</label><input className="input-field" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo</label><input type="email" className="input-field" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input className="input-field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input className="input-field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label><input className="input-field" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label><textarea className="input-field" rows={3} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Observaciones del cliente..." /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : (editing ? 'Actualizar Cliente' : 'Crear Cliente')}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
              <h2 className="text-lg font-semibold mb-2">¿Eliminar Cliente?</h2>
              <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => deleteMutation.mutate(deleteId)} className="btn-danger flex-1" disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button>
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
