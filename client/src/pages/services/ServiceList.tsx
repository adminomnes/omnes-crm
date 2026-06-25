import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Service } from '../../types';
import { useAuthStore } from '../../store/authStore';

const emptyService = { name: '', categoria: 'Consultoría', descripcion: '', valorBase: 0, impuesto: 19, activo: true };

export default function ServiceList() {
  const [search, setSearch] = useState('');
  const [filterActivo, setFilterActivo] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const isGerencia = useAuthStore((s) => s.isGerencia);

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', search, filterActivo],
    queryFn: () => api.get('/services', { params: { search, activo: filterActivo === 'all' ? undefined : filterActivo } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyService) => api.post('/services', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); toast.success('Servicio creado'); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/services/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); toast.success('Servicio actualizado'); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); toast.success('Servicio eliminado'); setDeleteId(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.put(`/services/${id}`, { activo }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); toast.success('Estado actualizado'); },
  });

  const categorias = ['Consultoría', 'Desarrollo', 'Marketing', 'Diseño', 'Soporte', 'Capacitación', 'Otro'];

  function openCreate() { setForm(emptyService); setEditing(null); setShowModal(true); }
  function openEdit(s: Service) { setForm({ name: s.name, categoria: s.categoria, descripcion: s.descripcion || '', valorBase: Number(s.valorBase), impuesto: Number(s.impuesto), activo: s.activo }); setEditing(s); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyService); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (editing) { updateMutation.mutate({ id: editing.id, data: form }); } else { createMutation.mutate(form); } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Catálogo de Servicios</h1><p className="page-subtitle">Administración de servicios OMNES</p></div>
        {isGerencia() && <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Servicio</button>}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" className="input-field pl-10" placeholder="Buscar servicios..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {[{ value: 'all', label: 'Todos' }, { value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }].map((f) => (
                <button key={f.value} onClick={() => setFilterActivo(f.value)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterActivo === f.value ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Nombre</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Categoría</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Valor Base</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Impuesto</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" /></td></tr>)
              ) : services?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No se encontraron servicios</td></tr>
              ) : services?.map((s: Service) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">{s.name}</td>
                  <td className="px-4 py-4"><span className="badge-blue">{s.categoria}</span></td>
                  <td className="px-4 py-4">${Number(s.valorBase).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-4">{s.impuesto}%</td>
                  <td className="px-4 py-4">
                    <span className={s.activo ? 'badge-green' : 'badge-red'}>{s.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => toggleMutation.mutate({ id: s.id, activo: !s.activo })} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title={s.activo ? 'Desactivar' : 'Activar'}>
                        {s.activo ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      {isGerencia() && <><button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></>}
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
            <div className="p-6 border-b border-gray-100"><h2 className="section-title">{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Servicio</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="select-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor Base ($)</label><input type="number" className="input-field" value={form.valorBase} onChange={(e) => setForm({ ...form, valorBase: Number(e.target.value) })} min={0} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Impuesto (%)</label><input type="number" className="input-field" value={form.impuesto} onChange={(e) => setForm({ ...form, impuesto: Number(e.target.value) })} min={0} max={100} required /></div>
                <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded border-gray-300 text-primary-800 focus:ring-primary-500" /> Servicio Activo</label></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea className="input-field" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : (editing ? 'Actualizar Servicio' : 'Crear Servicio')}
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
              <h2 className="text-lg font-semibold mb-2">¿Eliminar Servicio?</h2>
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
