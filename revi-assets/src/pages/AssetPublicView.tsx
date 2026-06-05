import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Package } from 'lucide-react';

// Vista pública de un activo — lee datos desde URL params
// No requiere base de datos local — funciona en cualquier dispositivo
export default function AssetPublicView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const nombre    = params.get('n')  ?? '—';
  const cc        = params.get('cc') ?? '—';
  const area      = params.get('a')  ?? '—';
  const estado    = params.get('e')  ?? '—';
  const raf       = params.get('r')  ?? '';
  const afNuevo   = params.get('af') ?? '';
  const afAnt     = params.get('aa') ?? '';
  const linea     = params.get('l')  ?? '';
  const marca     = params.get('m')  ?? '';
  const modelo    = params.get('mo') ?? '';
  const fecha     = params.get('f')  ?? '';
  const layout    = params.get('ub') ?? '';

  const ESTADO_COLOR: Record<string, string> = {
    'NUEVO':              'bg-green-100 text-green-800',
    'USADO':              'bg-blue-100 text-blue-800',
    'MAL ESTADO':         'bg-yellow-100 text-yellow-800',
    'FUERA DE USO':       'bg-red-100 text-red-800',
    'CHATARRA (DESCARTE)':'bg-gray-100 text-gray-600',
  };

  const Row = ({ label, value }: { label: string; value: string }) => {
    if (!value) return null;
    return (
      <div className="py-2.5 border-b border-gray-100 last:border-0 flex justify-between gap-4">
        <span className="text-xs text-gray-400 uppercase tracking-wide shrink-0">{label}</span>
        <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 opacity-80">
          <ChevronLeft size={22} />
        </button>
        <img src="/logo-revi-cables.jpg" alt="REVI" className="h-8 object-contain" />
        <div className="border-l border-red-500 pl-3">
          <p className="font-bold text-sm leading-none">REVI Assets</p>
          <p className="text-red-200 text-xs">Ficha de Activo</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Tarjeta principal */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg leading-tight">{nombre}</p>
              {afNuevo && (
                <span className="font-mono text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">
                  AF: {afNuevo}
                </span>
              )}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${ESTADO_COLOR[estado] ?? 'bg-gray-100 text-gray-600'}`}>
              {estado}
            </span>
          </div>

          <Row label="Centro de Costo" value={cc} />
          <Row label="Área"            value={area} />
          <Row label="Layout / Ubic."  value={layout} />
          <Row label="Línea Productiva"value={linea} />
          <Row label="Marca"           value={marca} />
          <Row label="Modelo"          value={modelo} />
          <Row label="AF Anterior"     value={afAnt} />
          <Row label="RAF"             value={raf} />
          <Row label="Fecha Inventario"value={fecha} />
        </div>

        {/* Aviso lectura */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-3 items-start">
          <Package size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Vista de solo lectura. Para editar este activo abre REVI Assets en el dispositivo donde fue registrado.
          </p>
        </div>
      </div>
    </div>
  );
}
