import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Trash2, FileText, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Document, Client } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function DocumentList() {
  const [search, setSearch] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadClient, setUploadClient] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const { data: clients } = useQuery({ queryKey: ['clients-simple'], queryFn: () => api.get('/clients').then(r => r.data) });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', search, clienteId, desde, hasta],
    queryFn: () => api.get('/documents', { params: { search, clienteId: clienteId || undefined, desde: desde || undefined, hasta: hasta || undefined } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); toast.success('Documento eliminado'); setDeleteId(null); },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); toast.success('Documento subido'); setShowUpload(false); setUploadFile(null); setUploadName(''); setUploadClient(''); },
  });

  const handleDownload = async (doc: Document) => {
    try {
      const token = localStorage.getItem('omnes_token');
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar documento');
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return toast.error('Seleccione un archivo');
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadName) formData.append('name', uploadName);
    if (uploadClient) formData.append('clienteId', uploadClient);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Repositorio de Documentos</h1><p className="page-subtitle">Busque, suba y descargue documentos</p></div>
        <button onClick={() => setShowUpload(true)} className="btn-primary"><Upload className="w-4 h-4" /> Subir Documento</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" className="input-field pl-10" placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select-field w-auto" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Todos los clientes</option>
              {clients?.map((c: Client) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" className="input-field w-auto" value={desde} onChange={(e) => setDesde(e.target.value)} title="Desde" />
            <input type="date" className="input-field w-auto" value={hasta} onChange={(e) => setHasta(e.target.value)} title="Hasta" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Nombre</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Tipo</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Asociado a</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Fecha</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Subido por</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(4)].map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" /></td></tr>)
              ) : documents?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No se encontraron documentos. Suba su primer documento.
                </td></tr>
              ) : documents?.map((d: Document) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">{d.name}</td>
                  <td className="px-4 py-4"><span className={`badge ${d.tipo === 'pdf' ? 'badge-red' : d.tipo === 'doc' || d.tipo === 'docx' ? 'badge-blue' : 'badge-gray'}`}>{d.tipo.toUpperCase()}</span></td>
                  <td className="px-4 py-4">{d.client?.name || '-'}</td>
                  <td className="px-4 py-4 text-gray-500">
                    {d.quotation ? d.quotation.correlativo : d.contract ? d.contract.correlativo : '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{new Date(d.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-4 text-gray-500">{d.user?.name}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(d)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Descargar"><Download className="w-4 h-4" /></button>
                      {isAdmin() && <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="section-title">Subir Documento</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Documento</label>
                <input className="input-field" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Dejar vacío para usar nombre del archivo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
                <select className="select-field" value={uploadClient} onChange={(e) => setUploadClient(e.target.value)}>
                  <option value="">Sin cliente</option>
                  {clients?.map((c: Client) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
                  {uploadFile ? (
                    <div>
                      <FileText className="w-8 h-8 mx-auto text-primary-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Haga clic para seleccionar archivo</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes (máx 20 MB)</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.svg,.txt,.csv" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={uploadMutation.isPending || !uploadFile}>
                {uploadMutation.isPending ? 'Subiendo...' : 'Subir Documento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
              <h2 className="text-lg font-semibold mb-2">¿Eliminar Documento?</h2>
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
