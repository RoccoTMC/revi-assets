import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ChevronLeft } from 'lucide-react';
import { getActivo, getFotos } from '../services/apiService';
import type { Activo } from '../types';

export default function AssetLabel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activo, setActivo] = useState<Activo | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (activoId: string) => {
    const [a, fotosRes] = await Promise.all([
      getActivo(activoId),
      getFotos(activoId),
    ]);
    setActivo(a ?? null);
    setFoto(fotosRes.data[0]?.imagen_data ?? null);
  };

  const handlePrint = () => window.print();

  if (!activo) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

  // IP guardada o detectada automáticamente — siempre con http://
  const savedIP = localStorage.getItem('revi_server_ip');
  const rawOrigin = window.location.hostname === 'localhost' ? '' : window.location.origin;
  const rawURL = savedIP ? `http://${savedIP}:5173` : rawOrigin;
  // Garantizar que siempre empiece con http://
  const serverURL = rawURL && !rawURL.startsWith('http') ? `http://${rawURL}` : rawURL;
  const isLocalhost = window.location.hostname === 'localhost' && !savedIP;

  // QR simplificado — solo contiene la URL a la ficha del activo
  // Mucho más fácil de escanear y navega directamente a los datos
  const buildQR = () => {
    if (!activo.id) return 'REVI Assets';
    return serverURL
      ? `${serverURL}/activos/${activo.id}`
      : `REVI Assets | ${activo.nombre_equipo} | CC: ${activo.centro_costo} | ${activo.estado_equipo}`;
  };
  const qrContent = buildQR();

  return (
    <>
      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg flex-1">Etiqueta QR</h1>
        <button
          onClick={handlePrint}
          className="bg-red-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-medium text-sm active:bg-red-800"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>

      {/* ── Selector tamaño (solo pantalla) ── */}
      <div className="print:hidden p-4 bg-gray-50">
        {/* Alerta si está en localhost */}
        {isLocalhost && (
          <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-xl p-3">
            <p className="text-xs font-semibold text-yellow-800 mb-1">⚠ QR sin URL de red</p>
            <p className="text-xs text-yellow-700 mb-2">
              Ingresa la IP de tu PC para que el QR abra la ficha desde otros celulares.
            </p>
            <div className="flex gap-2">
              <input
                id="ip-input"
                type="text"
                defaultValue="192.168.1.15"
                placeholder="192.168.1.15"
                className="flex-1 border border-yellow-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={() => {
                  const val = (document.getElementById('ip-input') as HTMLInputElement).value.trim();
                  if (val) { localStorage.setItem('revi_server_ip', val); window.location.reload(); }
                }}
                className="bg-yellow-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {!isLocalhost && (
          <p className="text-xs text-green-700 text-center mb-3 bg-green-50 rounded-lg py-2">
            ✓ QR incluye URL · Celulares en la misma red pueden abrir la ficha
          </p>
        )}

        <p className="text-xs text-gray-400 text-center mb-4">
          Vista previa · Al imprimir selecciona el tamaño de papel según tu Zebra
        </p>

        {/* Vista previa */}
        <div className="flex justify-center">
          <div ref={printRef} id="label-print">

            {/* ══ ETIQUETA ══ */}
            <div className="label-container bg-white border-2 border-gray-300 rounded-lg overflow-hidden"
              style={{ width: '384px', fontFamily: 'Arial, sans-serif' }}>

              {/* Header rojo */}
              <div className="bg-red-700 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo-revi-cables.jpg" alt="REVI" className="h-7 object-contain" />
                  <div className="border-l border-red-400 pl-2">
                    <p className="font-bold text-xs leading-none">REVI Assets</p>
                    <p className="text-red-200 text-xs leading-none mt-0.5">Control Activo Fijo</p>
                  </div>
                </div>
                <p className="text-red-200 text-xs">{activo.fecha_inventario}</p>
              </div>

              {/* Cuerpo */}
              <div className="flex p-3 gap-3">

                {/* QR */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <QRCodeSVG
                    value={qrContent}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                  <p className="text-xs text-gray-400">Escanear</p>
                  <p className="text-xs text-gray-300 break-all text-center mt-0.5" style={{fontSize:'9px', maxWidth:'110px'}}>
                    {qrContent.slice(0, 40)}…
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-bold text-gray-900 text-sm leading-tight">
                    {activo.nombre_equipo}
                  </p>

                  {activo.codigo_nuevo && (
                    <p className="text-xs font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded inline-block">
                      AF: {activo.codigo_nuevo}
                    </p>
                  )}

                  <div className="space-y-0.5 pt-1">
                    <InfoRow label="CC" value={activo.centro_costo} />
                    <InfoRow label="Área" value={activo.area} />
                    {activo.layout_ubicacion && (
                      <InfoRow label="Ubic." value={activo.layout_ubicacion} />
                    )}
                    {activo.linea_productiva && (
                      <InfoRow label="Línea" value={activo.linea_productiva} />
                    )}
                    <InfoRow label="Estado" value={activo.estado_equipo} />
                    {activo.raf && <InfoRow label="RAF" value={activo.raf} />}
                    {activo.marca && (
                      <InfoRow label="Equipo" value={`${activo.marca}${activo.modelo ? ` ${activo.modelo}` : ''}`} />
                    )}
                    {activo.codigo_antiguo && (
                      <InfoRow label="AF Ant." value={activo.codigo_antiguo} />
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {activo.usuario_registro}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(activo.fecha_registro).toLocaleDateString('es-CL')}
                </p>
              </div>

              {/* Foto si existe */}
              {foto && (
                <div className="border-t border-gray-200">
                  <img src={foto} alt={activo.nombre_equipo}
                    className="w-full h-28 object-cover" />
                </div>
              )}
            </div>
            {/* ══ FIN ETIQUETA ══ */}

          </div>
        </div>

        {/* Tips impresión */}
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm space-y-2">
          <p className="font-semibold text-sm text-gray-700">Tips para imprimir en Zebra</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Abre el diálogo de impresión (Ctrl+P)</li>
            <li>• Selecciona tu impresora Zebra</li>
            <li>• Tamaño de papel: 4" × 3" o 4" × 4" según tu rollo</li>
            <li>• Desactiva "Encabezados y pies de página"</li>
            <li>• Escala: "Ajustar a página"</li>
            <li>• Activa "Gráficos de fondo" para que salga el rojo</li>
          </ul>
        </div>
      </div>

      {/* ── Estilos de impresión ── */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; background: white; }
          .print\\:hidden { display: none !important; }
          #label-print { padding: 4mm; }
          .label-container {
            width: 100% !important;
            max-width: 100mm !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
          }
        }
      `}</style>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-xs">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="font-medium text-gray-800 truncate">{value}</span>
    </div>
  );
}
