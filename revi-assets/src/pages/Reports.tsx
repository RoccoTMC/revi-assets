import { useState } from 'react';
import { FileSpreadsheet, FileText, BarChart3, CheckCircle, Loader2 } from 'lucide-react';
import { getActivos } from '../services/apiService';
import { exportToExcel, exportToCSV } from '../services/exportService';

const REPORTES = [
  { id: 'todos',         label: 'Inventario Completo',    desc: 'Todos los activos' },
  { id: 'por_validar',   label: 'Pendientes de Validar',  desc: 'Sin confirmar' },
  { id: 'sin_foto',      label: 'Sin Fotografía',         desc: 'Sin imagen asociada' },
  { id: 'operativos',    label: 'Operativos',             desc: 'Estado: NUEVO o USADO' },
  { id: 'fuera_servicio',label: 'Fuera de Servicio',      desc: 'Estado: FUERA DE USO o CHATARRA' },
];

export default function Reports() {
  const [reporteId, setReporteId]   = useState('todos');
  const [exporting, setExporting]   = useState(false);
  const [resultado, setResultado]   = useState<number | null>(null);
  const [error, setError]           = useState('');

  const fetchActivos = async () => {
    const params: Record<string, string> = {};
    if (reporteId === 'por_validar')    params.validado = 'false';
    if (reporteId === 'operativos')     params.estado = 'NUEVO';
    if (reporteId === 'fuera_servicio') params.estado = 'FUERA DE USO';

    const res = await getActivos(Object.keys(params).length ? params : {});

    if (reporteId === 'sin_foto')      return res.data.filter(a => !a.tiene_foto);
    if (reporteId === 'operativos')    {
      const res2 = await getActivos({ estado: 'USADO' });
      return [...res.data, ...res2.data];
    }
    if (reporteId === 'fuera_servicio') {
      const res2 = await getActivos({ estado: 'CHATARRA (DESCARTE)' });
      return [...res.data, ...res2.data];
    }
    return res.data;
  };

  const handleExport = async (tipo: 'xlsx' | 'csv') => {
    setExporting(true);
    setResultado(null);
    setError('');
    try {
      const activos = await fetchActivos();
      const nombre  = REPORTES.find(r => r.id === reporteId)?.label.replace(/\s+/g, '_') ?? 'Reporte';
      if (tipo === 'xlsx') exportToExcel(activos, `REVI_${nombre}`);
      else                 exportToCSV(activos,   `REVI_${nombre}`);
      setResultado(activos.length);
    } catch {
      setError('Error generando el reporte. Verifica la conexión al servidor.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-red-700" />
        <h1 className="font-bold text-lg">Reportes y Exportación</h1>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Tipo de Reporte</label>
        <div className="space-y-2">
          {REPORTES.map(r => (
            <button key={r.id} onClick={() => { setReporteId(r.id); setResultado(null); setError(''); }}
              className={`w-full text-left p-3 rounded-xl border-2 active:opacity-80 ${reporteId === r.id ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className={`font-medium text-sm ${reporteId === r.id ? 'text-red-700' : 'text-gray-900'}`}>{r.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Formato</label>
        <div className="space-y-2">
          <button onClick={() => handleExport('xlsx')} disabled={exporting}
            className="w-full bg-green-600 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-3 active:bg-green-700 disabled:opacity-50">
            {exporting ? <Loader2 size={22} className="animate-spin" /> : <FileSpreadsheet size={22} />}
            Exportar Excel (.xlsx)
          </button>
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl py-4 font-semibold flex items-center justify-center gap-3 active:bg-gray-50 disabled:opacity-50">
            <FileText size={22} /> Exportar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {resultado !== null && !error && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <p className="text-green-700 font-medium text-sm">
            {resultado === 0 ? 'Sin activos para este reporte' : `${resultado} activo${resultado !== 1 ? 's' : ''} exportado${resultado !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
    </div>
  );
}
