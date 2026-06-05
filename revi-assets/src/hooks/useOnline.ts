import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { queueService } from '../services/queueService';

interface OnlineState {
  online:  boolean;
  syncing: boolean;
}

export const useOnline = (): OnlineState => {
  const [online,  setOnline]  = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      if (queueService.countPending() === 0) return;
      setSyncing(true);
      try {
        await syncService.syncAll();
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intentar sync al montar si hay pendientes y hay red
    if (navigator.onLine && queueService.countPending() > 0) {
      setSyncing(true);
      syncService.syncAll().finally(() => setSyncing(false));
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { online, syncing };
};
