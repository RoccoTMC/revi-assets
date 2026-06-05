/**
 * REVI Assets — Servicio de Sincronización
 * Procesa la cola de pendientes cuando hay conexión.
 * Usa llamadas directas al servidor (sin re-encolar si falla).
 */

import { queueService } from './queueService';

// Base URL del servidor backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SyncResult {
  synced:  number;
  failed:  number;
  pending: number;
}

let _syncing = false;

const headers = () => {
  const token = localStorage.getItem('revi_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const syncService = {
  isSyncing: () => _syncing,

  async syncAll(): Promise<SyncResult> {
    if (_syncing) return { synced: 0, failed: 0, pending: queueService.countPending() };
    _syncing = true;

    const pending = [...queueService.getPending()].sort((a, b) => a.timestamp - b.timestamp);
    let synced = 0;
    let failed = 0;

    for (const op of pending) {
      // Pausar operaciones con demasiados reintentos
      if (op.retries > 3) { failed++; continue; }

      try {
        if (op.type === 'CREATE' && op.resource === 'activo') {
          // Usar batch para soportar INSERT OR IGNORE (idempotente)
          const res = await fetch(`${API_BASE_URL}/api/sync/batch`, {
            method:  'POST',
            headers: headers(),
            body:    JSON.stringify({
              activos:  [op.data],
              usuario:  localStorage.getItem('revi_usuario') ?? 'sistema',
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

        } else if (op.type === 'UPDATE' && op.resource === 'activo') {
          const res = await fetch(`${API_BASE_URL}/api/activos/${op.data.id}`, {
            method:  'PATCH',
            headers: headers(),
            body:    JSON.stringify(op.data),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

        } else if (op.type === 'DELETE' && op.resource === 'activo') {
          const res = await fetch(`${API_BASE_URL}/api/activos/${op.data.id}`, {
            method:  'DELETE',
            headers: headers(),
          });
          // 404 = ya fue eliminado → ok igual
          if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);

        } else if (op.type === 'FOTO' && op.resource === 'foto') {
          const res = await fetch(`${API_BASE_URL}/api/activos/${op.parentId}/fotos`, {
            method:  'POST',
            headers: headers(),
            body:    JSON.stringify(op.data),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }

        queueService.removePending(op.id);
        synced++;

      } catch (err) {
        const error = err instanceof Error ? err.message : 'Error desconocido';
        queueService.updateRetry(op.id, error);
        failed++;
        // Backoff exponencial: 1s, 2s, 4s, 8s…
        await sleep(Math.min(Math.pow(2, op.retries) * 1000, 8000));
      }
    }

    _syncing = false;
    return { synced, failed, pending: queueService.countPending() };
  },
};
