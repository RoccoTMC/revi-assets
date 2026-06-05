import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit, Trash2, CheckCircle, Camera, QrCode, Loader2 } from 'lucide-react';
import { getActivo, updateActivo, deleteActivo, getFotos } from '../services/apiService';
import type { Activo } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function AssetDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [activo, setActivo]       = useState<Activo | null>(null);
  const [fotoSrc, setFotoSrc]     = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showFotoModal, setShowFotoModal] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => { if (id) loadData(id); }, [id]);

  const loadData = async (activoId: string) => {
    setLoading(true);
    setError('');
    try {
      const [a, fotosRes] = await Promise.all([
        getActivo(activoId),
        getFotos(activoId),
      ]);
      setActivo(a);
      if (fotosRes.data.length) setFotoSrc(fotosRes.data[0].imagen_data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando activo');
    } finally {
      setLoading(false);
    }
  };

  const handleValidar = async () => {
    if (!activo?.id) return;
    await updateActivo(activo.id, { validado: true });
    setActivo(prev => prev ? { ...prev, validado: true } : null);
  };

  const handleEliminar = async () => {
    if (!activo?.id) return;
    await deleteActivo(activo.id);
    navigate('/activos', { replace: true });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-gray-400" /></div>;
  if (error)   return <div className="p-4"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><p className="text-red-700 text-sm">{error}</p></div></div>;
  if (!activo) return null;

  const Campo = ({ label, value }: { label: string; value?: string | number }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="py-2.5 border-b border-gray-100 last:border-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    );
  };

  const Sec = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{titulo}</p>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1"><ChevronLeft size={24} /></button>
        <h1 className="font-semibold text-base flex-1 truncate">{activo.nombre_equipo}</h1>
        <button onClick={() => navigate(`/activos/${id}/editar`)} className="text-red-700 p-1"><Edit size={22} /></button>
      </div>

      {fotoSrc
        ? <button onClick={() => setShowFotoModal(true)} className="w-full bg-black relative overflow-hidden group">
            <img src={fotoSrc} alt={activo.nombre_equipo} className="w-full h-56 object-contain" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition">
              <span className="text-white/0 group-hover:text-white/70 text-sm font-medium">Click para ampliar</span>
            </div>
          </button>
        : <div className="w-full h-32 bg-gray-200 flex flex-col items-center justify-center text-gray-400 gap-1">
            <Camera size={28} /><span className="text-xs">Sin fotografía</span>
          </div>
      }

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-bold text-gray-900 text-base">{activo.nombre_equipo}</p>
            {activo.codigo_nuevo && <p className="font-mono text-xs text-red-700 mt-0.5">AF: {activo.codigo_nuevo}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge estado={activo.estado_equipo} />
            {activo.validado && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Validado</span>}
          </div>
        </div>

        <Sec titulo="Clasificación">
          <Campo label="Centro de Costo"   value={activo.centro_costo} />
          <Campo label="Área"              value={activo.area} />
          <Campo label="Layout / Ubic."    value={activo.layout_ubicacion} />
          <Campo label="Línea Productiva"  value={activo.linea_productiva} />
          <Campo label="Periférico"        value={activo.periferico} />
          <Campo label="Categoría"         value={activo.categoria} />
        </Sec>

        <Sec titulo="Identificación">
          <Campo label="Marca"             value={activo.marca} />
          <Campo label="Modelo"            value={activo.modelo} />
          <Campo label="Año Fabricación"   value={activo.anio} />
          <Campo label="N° Placa Antiguo"  value={activo.codigo_antiguo} />
          <Campo label="RAF"               value={activo.raf} />
          <Campo label="Código AF Nuevo"   value={activo.codigo_nuevo} />
        </Sec>

        <Sec titulo="Trazabilidad">
          <Campo label="Fecha Inventario"  value={activo.fecha_inventario} />
          <Campo label="Usuario Registro"  value={activo.usuario_registro} />
          <Campo label="Fecha Registro"    value={new Date(activo.fecha_registro).toLocaleString('es-CL')} />
          <Campo label="Última Modificación" value={new Date(activo.fecha_ultima_mod).toLocaleString('es-CL')} />
          <Campo label="Observaciones"     value={activo.observaciones} />
        </Sec>

        <button onClick={() => navigate(`/activos/${id}/etiqueta`)}
          className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 active:bg-gray-800">
          <QrCode size={20} /> Generar Etiqueta QR
        </button>

        {!activo.validado && (
          <button onClick={handleValidar}
            className="w-full bg-green-600 text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 active:bg-green-700">
            <CheckCircle size={20} /> Marcar como Validado
          </button>
        )}

        <button onClick={() => setShowDelete(true)}
          className="w-full border border-red-200 text-red-500 rounded-xl py-3 font-medium flex items-center justify-center gap-2 active:bg-red-50">
          <Trash2 size={18} /> Eliminar Activo
        </button>
      </div>

      {/* Modal foto fullscreen */}
      {showFotoModal && fotoSrc && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4" onClick={() => setShowFotoModal(false)}>
          <div className="max-w-4xl max-h-screen flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={fotoSrc} alt={activo.nombre_equipo} className="max-w-full max-h-screen object-contain" />
          </div>
          <button onClick={() => setShowFotoModal(false)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70">
            <span className="text-xl">✕</span>
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">Presiona ESC o haz click para cerrar</p>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg">¿Eliminar activo?</h3>
            <p className="text-gray-500 text-sm">Se eliminará <strong>{activo.nombre_equipo}</strong> y su fotografía.</p>
            <button onClick={handleEliminar} className="w-full bg-red-700 text-white rounded-xl py-3.5 font-semibold">Sí, eliminar</button>
            <button onClick={() => setShowDelete(false)} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Cerrar modal con ESC */}
      {showFotoModal && typeof window !== 'undefined' && (
        <script>{`window.addEventListener('keydown', e => e.key === 'Escape' && window.dispatchEvent(new CustomEvent('closeFotoModal')))`}</script>
      )}
    </div>
  );
}
