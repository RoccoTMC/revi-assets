import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Package, Loader2 } from 'lucide-react';
import { getActivos, getDuplicados } from '../services/apiService';
import type { Activo, EstadoEquipo } from '../types';
import StatusBadge from '../components/StatusBadge';

const ESTADOS: EstadoEquipo[] = [
  'NUEVO', 'USADO', 'MAL ESTADO', 'FUERA DE USO', 'CHATARRA (DESCARTE)',
];

export default function AssetList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activos, setActivos]       = useState<Activo[]>([]);
  const [duplicadosIds, setDuplicadosIds] = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState('');
  const [filtroEstado, setFiltro]   = useState('');
  const [filtroCentro, setCentro]   = useState('');
  const [centros, setCentros]       = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Aplicar filtros desde URL
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    console.log('🔍 Filter URL param:', filterParam);
    if (filterParam === 'sin_foto') {
      console.log('✓ Aplicando filtro: sin_foto');
    } else if (filterParam === 'por_validar') {
      console.log('✓ Aplicando filtro: por_validar');
      setFiltro('');
    } else if (filterParam === 'duplicados') {
      console.log('✓ Aplicando filtro: duplicados - cargando...');
      loadDuplicados();
    }
  }, [searchParams]);

  const loadDuplicados = async () => {
    try {
      const res = await getDuplicados();
      setDuplicadosIds(new Set(res.data.map(a => a.id as string)));
    } catch {
      console.error('Error cargando duplicados');
    }
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActivos();
      setActivos(res.data);
      setCentros([...new Set(res.data.map(a => a.centro_costo))].sort());
    } catch {
      setError('No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  };

  const filterParam = searchParams.get('filter');

  const filtrados = activos.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.nombre_equipo.toLowerCase().includes(q) ||
      (a.codigo_nuevo ?? '').toLowerCase().includes(q) ||
      (a.raf ?? '').toLowerCase().includes(q) ||
      (a.marca ?? '').toLowerCase().includes(q) ||
      a.centro_costo.toLowerCase().includes(q);

    // Aplicar filtros por URL
    if (filterParam === 'sin_foto') return matchSearch && !a.tiene_foto;
    if (filterParam === 'por_validar') return matchSearch && !a.validado;
    if (filterParam === 'duplicados') return matchSearch && duplicadosIds.has(a.id as string);

    // Filtro normal
    return matchSearch &&
      (!filtroEstado || a.estado_equipo === filtroEstado) &&
      (!filtroCentro || a.centro_costo === filtroCentro);
  });

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-200 p-3 space-y-2 sticky top-0 z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder="Buscar nombre, código, RAF, marca..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white shrink-0">
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroCentro} onChange={e => setCentro(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white shrink-0">
            <option value="">Todos los centros</option>
            {centros.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={load} className="text-xs text-red-700 border border-red-200 rounded-lg px-2 py-1.5 shrink-0">
            ↻ Actualizar
          </button>
        </div>
      </div>

      <div className="px-4 py-2 text-xs text-gray-400">
        {filtrados.length} de {activos.length} activos
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={load} className="mt-2 text-xs text-red-600 underline">Reintentar</button>
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin resultados</p>
        </div>
      ) : (
        <div className="bg-white divide-y divide-gray-100">
          {filtrados.map(a => (
            <button key={a.id} onClick={() => navigate(`/activos/${a.id}`)}
              className="w-full flex items-center p-4 text-left active:bg-gray-50 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                    {a.centro_costo}
                  </span>
                  {!a.validado && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />}
                  {!a.tiene_foto && <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" title="Sin foto" />}
                  {duplicadosIds.has(a.id as string) && (
                    <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">DUPLICADO</span>
                  )}
                </div>
                <p className="font-medium text-gray-900 truncate">{a.nombre_equipo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {a.area}{a.marca ? ` · ${a.marca}` : ''}{a.modelo ? ` ${a.modelo}` : ''}
                </p>
                {duplicadosIds.has(a.id as string) && a.codigo_nuevo && (
                  <p className="text-xs text-red-600 font-semibold mt-1">Código: {a.codigo_nuevo}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge estado={a.estado_equipo} />
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
