import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, FileSignature,
  Settings, FolderOpen, LogOut, ChevronLeft, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';
import { useState } from 'react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/servicios', label: 'Servicios', icon: Package },
  { path: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { path: '/contratos', label: 'Contratos', icon: FileSignature },
  { path: '/documentos', label: 'Documentos', icon: FolderOpen },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={clsx(
      'bg-primary-950 text-white flex flex-col transition-all duration-300 min-h-screen',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className={clsx('flex items-center gap-3 px-4 h-16 border-b border-primary-800', collapsed && 'justify-center')}>
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-primary-800" />
        </div>
        {!collapsed && <span className="font-bold text-lg truncate">OMNES</span>}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary-800 text-white' : 'text-primary-200 hover:bg-primary-800/50 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className={clsx('border-t border-primary-800 p-3', collapsed && 'text-center')}>
        {!collapsed && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-primary-300 truncate">{user?.email}</p>
            <span className="badge bg-primary-700 text-white mt-1 text-[10px]">{user?.role}</span>
          </div>
        )}
        <button onClick={logout} className={clsx(
          'flex items-center gap-2 text-primary-300 hover:text-white transition-colors text-sm w-full',
          collapsed ? 'justify-center' : 'px-1'
        )}>
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Cerrar Sesión'}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-primary-800 text-white rounded-full p-0.5 border-2 border-primary-950 hover:bg-primary-700"
      >
        <ChevronLeft className={clsx('w-3 h-3 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
