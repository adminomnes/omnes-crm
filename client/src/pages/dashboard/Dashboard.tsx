import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, CheckCircle, FileSignature, Users, DollarSign, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { DashboardData } from '../../types';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

function StatCard({ title, value, icon: Icon, color, prefix = '' }: { title: string; value: string | number; icon: any; color: string; prefix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{prefix}{typeof value === 'number' ? value.toLocaleString('es-CL') : value}</p>
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida',
};
const statusBadges: Record<string, string> = {
  BORRADOR: 'badge-gray', ENVIADA: 'badge-blue', ACEPTADA: 'badge-green', RECHAZADA: 'badge-red', VENCIDA: 'badge-yellow',
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-80 bg-gray-200 rounded-xl" />
    </div>
  );

  const monthlyData = (data?.monthlyQuotations || []).map((m: any) => ({
    month: new Date(m.month).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
    count: Number(m.count),
    amount: Number(m.amount),
  }));

  const statusData = (data?.statusCounts || []).map((s) => ({
    name: statusLabels[s.estado] || s.estado,
    value: s._count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del sistema de gestión comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard title="Cotizaciones Emitidas" value={data?.totalQuotations || 0} icon={FileText} color="bg-amber-500" />
        <StatCard title="Cotizaciones Aceptadas" value={data?.acceptedQuotations || 0} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard title="Contratos Activos" value={data?.activeContracts || 0} icon={FileSignature} color="bg-blue-500" />
        <StatCard title="Clientes Registrados" value={data?.totalClients || 0} icon={Users} color="bg-violet-500" />
        <StatCard title="Monto Total Cotizado" value={Number(data?.totalQuoted || 0)} icon={DollarSign} color="bg-primary-600" prefix="$" />
        <StatCard title="Monto Total Vendido" value={Number(data?.totalSold || 0)} icon={TrendingUp} color="bg-green-600" prefix="$" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header"><h2 className="section-title">Cotizaciones por Mes</h2></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} name="Cotizaciones" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="section-title">Estado Cotizaciones</h2></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h2 className="section-title">Últimas Cotizaciones</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">N°</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cliente</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.recentQuotations || []).slice(0, 5).map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{q.correlativo}</td>
                    <td className="px-4 py-3">{q.client?.name}</td>
                    <td className="px-4 py-3">${Number(q.total).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3"><span className={statusBadges[q.estado]}>{statusLabels[q.estado]}</span></td>
                  </tr>
                ))}
                {!data?.recentQuotations?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin cotizaciones recientes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="section-title">Últimos Contratos</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">N°</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Cliente</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Valor</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.recentContracts || []).slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.correlativo}</td>
                    <td className="px-4 py-3">{c.client?.name}</td>
                    <td className="px-4 py-3">${Number(c.valorTotal).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3"><span className={`badge ${c.estado === 'ACTIVO' ? 'badge-green' : c.estado === 'FINALIZADO' ? 'badge-blue' : 'badge-gray'}`}>{c.estado}</span></td>
                  </tr>
                ))}
                {!data?.recentContracts?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin contratos recientes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
