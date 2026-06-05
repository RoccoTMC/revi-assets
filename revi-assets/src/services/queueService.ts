/**
 * REVI Assets — Cola de Operaciones Pendientes
 * Persiste en localStorage. Se procesa cuando vuelve la conexión.
 */

export interface PendingOperation {
  id:         string;
  type:       'CREATE' | 'UPDATE' | 'DELETE' | 'FOTO';
  resource:   'activo' | 'foto';
  data:       Record<string, unknown>;
  parentId?:  string;   // activo_id para fotos
  timestamp:  number;
  retries:    number;
  lastError?: string;
}

const KEY = 'revi_pending_queue';

const read = (): PendingOperation[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
};

const write = (items: PendingOperation[]) =>
  localStorage.setItem(KEY, JSON.stringify(items));

export const queueService = {
  getPending:   (): PendingOperation[] => read(),
  countPending: (): number => read().length,

  addToPending(op: PendingOperation): void {
    const items = read();
    const idx   = items.findIndex(i => i.id === op.id);
    if (idx >= 0) items[idx] = op; else items.push(op);
    write(items);
  },

  removePending(id: string): void {
    write(read().filter(i => i.id !== id));
  },

  updateRetry(id: string, error: string): void {
    write(read().map(i =>
      i.id === id ? { ...i, retries: i.retries + 1, lastError: error } : i
    ));
  },

  clearQueue: () => localStorage.removeItem(KEY),
};
