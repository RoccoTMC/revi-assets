import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Package, Plus, BarChart3, LogOut } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import PendingSync from './PendingSync';

export default function Layout() {
  const navigate = useNavigate();
  const usuario  = localStorage.getItem('revi_usuario') ?? '';

  const handleLogout = () => {
    localStorage.removeItem('revi_token');
    localStorage.removeItem('revi_usuario');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-700 text-white px-4 py-3 flex items-center gap-3 shadow-md sticky top-0 z-20">
        <img src="/logo-revi-cables.jpg" alt="REVI" className="h-9 w-auto object-contain" />
        <div className="border-l border-red-500 pl-3 flex-1 min-w-0">
          <h1 className="font-bold text-lg leading-none">REVI Assets</h1>
          <p className="text-red-200 text-xs truncate">{usuario}</p>
        </div>
        <ConnectionStatus />
        <button onClick={handleLogout} className="text-red-200 p-1 hover:text-white ml-1" title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>

      {/* Banner de pendientes (aparece solo si hay registros sin sincronizar) */}
      <PendingSync />

      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Navegación inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center z-20">
        <NavLink to="/" end className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-1 text-xs ${isActive ? 'text-red-700' : 'text-gray-500'}`}>
          <Home size={20} /><span>Inicio</span>
        </NavLink>

        <NavLink to="/activos" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-1 text-xs ${isActive ? 'text-red-700' : 'text-gray-500'}`}>
          <Package size={20} /><span>Activos</span>
        </NavLink>

        <button onClick={() => navigate('/activos/nuevo')} className="flex-1 flex flex-col items-center py-2 gap-1">
          <div className="bg-red-700 text-white rounded-full p-3 -mt-6 shadow-lg active:bg-red-800">
            <Plus size={24} />
          </div>
          <span className="text-xs text-gray-500 mt-1">Nuevo</span>
        </button>

        <NavLink to="/reportes" className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-1 text-xs ${isActive ? 'text-red-700' : 'text-gray-500'}`}>
          <BarChart3 size={20} /><span>Reportes</span>
        </NavLink>
      </nav>
    </div>
  );
}
