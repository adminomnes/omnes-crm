import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Save, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CompanyConfig() {
  const [activeTab, setActiveTab] = useState<'empresa' | 'legal'>('empresa');
  const [form, setForm] = useState<any>({});
  const [legal, setLegal] = useState<any>({});
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get('/config').then(r => r.data),
  });

  useEffect(() => {
    if (config) {
      setForm({
        razonSocial: config.razonSocial || '', nombreComercial: config.nombreComercial || '', rut: config.rut || '',
        giroComercial: config.giroComercial || '', direccion: config.direccion || '', ciudad: config.ciudad || '',
        pais: config.pais || '', telefono: config.telefono || '', correo: config.correo || '', sitioWeb: config.sitioWeb || '',
        colores: config.colores || '', piePagina: config.piePagina || '', firmaDigital: config.firmaDigital || '',
      });
      if (config.legalRepresentative) {
        setLegal({
          nombreCompleto: config.legalRepresentative.nombreCompleto || '', rut: config.legalRepresentative.rut || '',
          cargo: config.legalRepresentative.cargo || '', correo: config.legalRepresentative.correo || '',
          telefono: config.legalRepresentative.telefono || '',
        });
      }
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => api.put('/config', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config'] }); toast.success('Configuración guardada'); },
  });

  const saveLegalMutation = useMutation({
    mutationFn: (data: any) => api.put('/config/legal', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config'] }); toast.success('Representante legal guardado'); },
  });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg w-64" />
      <div className="card p-6"><div className="h-96 bg-gray-100 rounded-lg" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Configuración Corporativa</h1><p className="page-subtitle">Datos oficiales de OMNES Holding</p></div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('empresa')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'empresa' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Building2 className="w-4 h-4" /> Información Empresa
        </button>
        <button onClick={() => setActiveTab('legal')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'legal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <User className="w-4 h-4" /> Representante Legal
        </button>
      </div>

      {activeTab === 'empresa' && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">Datos de la Empresa</h2></div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label><input className="input-field" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label><input className="input-field" value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">RUT</label><input className="input-field" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} /></div>
              <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Giro Comercial</label><input className="input-field" value={form.giroComercial} onChange={(e) => setForm({ ...form, giroComercial: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input className="input-field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input className="input-field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label><input className="input-field" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">País</label><input className="input-field" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo Corporativo</label><input type="email" className="input-field" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label><input className="input-field" value={form.sitioWeb} onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })} /></div>
            </div>

            <hr className="border-gray-200" />
            <div><h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Palette className="w-4 h-4" /> Branding</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Colores Corporativos (JSON)</label><input className="input-field" placeholder='{"primary":"#1e40af","secondary":"#f3f4f6"}' value={form.colores} onChange={(e) => setForm({ ...form, colores: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Firma Digital</label><textarea className="input-field" rows={3} value={form.firmaDigital} onChange={(e) => setForm({ ...form, firmaDigital: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Pie de Página Corporativo</label><textarea className="input-field" rows={2} value={form.piePagina} onChange={(e) => setForm({ ...form, piePagina: e.target.value })} /></div>
            </div>

            <div className="pt-2">
              <button onClick={() => saveConfigMutation.mutate(form)} className="btn-primary" disabled={saveConfigMutation.isPending}>
                <Save className="w-4 h-4" /> {saveConfigMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'legal' && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">Representante Legal</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input className="input-field" value={legal.nombreCompleto || ''} onChange={(e) => setLegal({ ...legal, nombreCompleto: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">RUT</label><input className="input-field" value={legal.rut || ''} onChange={(e) => setLegal({ ...legal, rut: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label><input className="input-field" value={legal.cargo || ''} onChange={(e) => setLegal({ ...legal, cargo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo</label><input type="email" className="input-field" value={legal.correo || ''} onChange={(e) => setLegal({ ...legal, correo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input className="input-field" value={legal.telefono || ''} onChange={(e) => setLegal({ ...legal, telefono: e.target.value })} /></div>
            </div>
            <div className="pt-4">
              <button onClick={() => saveLegalMutation.mutate(legal)} className="btn-primary" disabled={saveLegalMutation.isPending}>
                <Save className="w-4 h-4" /> {saveLegalMutation.isPending ? 'Guardando...' : 'Guardar Representante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
