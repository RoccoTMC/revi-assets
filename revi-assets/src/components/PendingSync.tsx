import { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, Clock } from 'lucide-react';
import { queueService } from '../services/queueService';
import { useOnline } from '../hooks/useOnline';

export default function PendingSync() {
  const { online, syncing } = useOnline();
  const [pending, setPending] = useState(queueService.countPending());

  useEffect(() => {
    const interval = setInterval(() => setPending(queueService.countPending()), 1500);
    return () => clearInterval(interval);
  }, []);

  if (pending === 0 && !syncing) return null;

  const label = pending === 1 ? '1 registro pendiente' : `${pending} registros pendientes`;

  if (syncing) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-blue-700 text-xs">
        <RefreshCw size={13} className="animate-spin shrink-0" />
        <span>Sincronizando {label} con el servidor…</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2 text-orange-700 text-xs">
        <WifiOff size={13} className="shrink-0" />
        <span>{label} sin WiFi — se sincronizará al reconectar</span>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-yellow-700 text-xs">
      <Clock size={13} className="shrink-0" />
      <span>{label} — esperando sincronización…</span>
    </div>
  );
}
