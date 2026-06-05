import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Camera, AlertTriangle, Copy, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { getActivos, getReportValidation } from '../services/apiService';
import type { Activo } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [recientes, setRecientes] = useState<Activo[]>([]);
  const [stats, setStats]   = useState({ total: 0, sinFoto: 0, pendientes: 0, duplicados: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [activosRes, report] = await Promise.all([
        getActivos(),
        getReportValidation(),
      ]);
      setRecientes(activosRes.data.slice(0, 5));
      setStats({
        total:      report.total_activos,
        sinFoto:    report.sin_fotografia,
        pendientes: report.pendientes_validar,
        duplicados: report.codigos_duplicados,
      });
    } catch {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ label, value, icon: Icon, borderColor, onClick }: {
    label: string; value: number; icon: React.ElementType;
    borderColor: string; onClick: () => void;
  }) => (
    <button onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${borderColor} flex items-center justify-between w-full text-left active:opacity-80`}>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <Icon size={28} className="text-gray-300" />
    </button>
  );

  const goToAssets = (filter?: string) => {
    if (filter) {
      navigate(`/activos?filter=${filter}`);
    } else {
      navigate('/activos');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 size={32} className="animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-700 font-medium text-sm">{error}</p>
        <button onClick={loadData} className="mt-2 text-xs text-red-600 underline">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Total Activos" value={stats.total} icon={Package}
          borderColor="border-red-700" onClick={() => goToAssets()} />
        <KPICard label="Sin Fotografía" value={stats.sinFoto} icon={Camera}
          borderColor="border-red-400" onClick={() => goToAssets('sin_foto')} />
        <KPICard label="Por Validar" value={stats.pendientes} icon={AlertTriangle}
          borderColor="border-yellow-400" onClick={() => goToAssets('por_validar')} />
        <KPICard label="Duplicados" value={stats.duplicados} icon={Copy}
          borderColor="border-purple-400" onClick={() => goToAssets('duplicados')} />
      </div>

      <button onClick={() => navigate('/activos/nuevo')}
        className="w-full bg-red-700 text-white rounded-xl py-4 flex items-center justify-center gap-3 font-semibold text-lg shadow-sm active:bg-red-800">
        <Plus size={24} /> Registrar Activo
      </button>

      {recientes.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registros Recientes</h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {recientes.map(a => (
              <button key={a.id} onClick={() => navigate(`/activos/${a.id}`)}
                className="w-full flex items-center p-3 text-left active:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.nombre_equipo}</p>
                  <p className="text-xs text-gray-500">{a.centro_costo} · {a.area}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <StatusBadge estado={a.estado_equipo} />
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin activos registrados</p>
          <p className="text-sm mt-1">Presiona "Registrar Activo" para comenzar</p>
        </div>
      )}
    </div>
  );
}
