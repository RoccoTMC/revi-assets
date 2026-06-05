/**
 * REVI Assets — API Service
 * Todas las llamadas al servidor pasan por aquí.
 * Si falla la conexión → encola localmente para sync posterior.
 */

import type { Activo } from '../types';
import { queueService } from './queueService';
import { generateId } from '../utils/uuid';

// Base URL del servidor backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getHeaders = () => {
  const token = localStorage.getItem('revi_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers: getHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.json();
}

export interface ApiResult {
  success:  boolean;
  queued?:  boolean;
  id?:      string;
  error?:   string;
}

// ── Health ────────────────────────────────────────────────────────
export const checkHealth = () =>
  request<{ status: string; activos: number }>('/health');

// ── Activos ───────────────────────────────────────────────────────
export const getActivos = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request<{ data: Activo[]; total: number }>(`/api/activos${qs ? `?${qs}` : ''}`);
};

export const getActivo = (id: string) =>
  request<Activo>(`/api/activos/${id}`);

export const createActivo = async (data: Omit<Activo, 'id'>): Promise<ApiResult> => {
  const id = generateId();
  const payload = { ...data, id };

  try {
    const res = await fetch('/api/activos', {
      method:  'POST',
      headers: getHeaders(),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Error ${res.status}`);
    }
    queueService.removePending(id);
    return { success: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Error desconocido';
    queueService.addToPending({
      id,
      type:      'CREATE',
      resource:  'activo',
      data:      payload as Record<string, unknown>,
      timestamp: Date.now(),
      retries:   0,
      lastError: error,
    });
    return { success: false, queued: true, id };
  }
};

export const updateActivo = async (id: string, data: Partial<Activo>): Promise<ApiResult> => {
  try {
    await request(`/api/activos/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
    });
    queueService.removePending(`upd-${id}`);
    return { success: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Error desconocido';
    queueService.addToPending({
      id:        `upd-${id}`,
      type:      'UPDATE',
      resource:  'activo',
      data:      { ...data, id } as Record<string, unknown>,
      timestamp: Date.now(),
      retries:   0,
      lastError: error,
    });
    return { success: false, queued: true, id };
  }
};

export const deleteActivo = async (id: string): Promise<ApiResult> => {
  try {
    await request(`/api/activos/${id}`, { method: 'DELETE' });
    return { success: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Error desconocido';
    queueService.addToPending({
      id:        `del-${id}`,
      type:      'DELETE',
      resource:  'activo',
      data:      { id } as Record<string, unknown>,
      timestamp: Date.now(),
      retries:   0,
      lastError: error,
    });
    return { success: false, queued: true, id };
  }
};

// ── Fotos ─────────────────────────────────────────────────────────
export const getFotos = (activoId: string) =>
  request<{ data: { id: string; imagen_data: string; tipo: string }[] }>(
    `/api/activos/${activoId}/fotos`
  );

export const uploadFoto = async (activoId: string, imagen_data: string, tipo = 'principal'): Promise<ApiResult> => {
  const fotoId = generateId();
  try {
    const res = await fetch(`/api/activos/${activoId}/fotos`, {
      method:  'POST',
      headers: getHeaders(),
      body:    JSON.stringify({ imagen_data, tipo, orden: 0 }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const json = await res.json();
    return { success: true, id: json.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Error';
    queueService.addToPending({
      id:        `foto-${fotoId}`,
      type:      'FOTO',
      resource:  'foto',
      parentId:  activoId,
      data:      { imagen_data, tipo, orden: 0 } as Record<string, unknown>,
      timestamp: Date.now(),
      retries:   0,
      lastError: error,
    });
    return { success: false, queued: true, id: fotoId };
  }
};

export const deleteFoto = (fotoId: string) =>
  request<{ success: boolean }>(`/api/fotos/${fotoId}`, { method: 'DELETE' });

// ── Reportes ──────────────────────────────────────────────────────
export const getReportValidation = () =>
  request<{
    total_activos:      number;
    pendientes_validar: number;
    sin_fotografia:     number;
    codigos_duplicados: number;
    por_centro_costo:   { centro_costo: string; total: number; validados: number }[];
    por_estado:         { estado_equipo: string; total: number }[];
  }>('/api/reports/validation');

// ── Duplicados ────────────────────────────────────────────────────
export const getDuplicados = () =>
  request<{ data: Activo[]; total: number }>('/api/duplicados');

// ── Sync ──────────────────────────────────────────────────────────
export const syncBatch = (activos: Activo[]) =>
  request<{ success: boolean; creados: number; ignorados: number }>(
    '/api/sync/batch',
    { method: 'POST', body: JSON.stringify({ activos }) }
  );
