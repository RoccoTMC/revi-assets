import { useEffect, useState } from 'react';
import { useOnline } from '../hooks/useOnline';
import { checkHealth } from '../services/apiService';

export default function ConnectionStatus() {
  const { online, syncing }   = useOnline();
  const [serverOk, setServer] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      if (!online) { setServer(false); return; }
      try { await checkHealth(); setServer(true); }
      catch  { setServer(false); }
    };

    check();
    timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [online]);

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-xs text-red-200 hidden sm:inline">Sincronizando</span>
      </div>
    );
  }

  if (serverOk && online) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs text-red-200 hidden sm:inline">Conectado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      <span className="text-xs text-red-200 hidden sm:inline">Sin conexión</span>
    </div>
  );
}
