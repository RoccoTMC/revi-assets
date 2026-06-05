import Dexie, { type Table } from 'dexie';
import type { Activo, Foto } from '../types';

class ReviAssetsDB extends Dexie {
  activos!: Table<Activo>;
  fotos!: Table<Foto>;

  constructor() {
    super('ReviAssetsDB');
    this.version(2).stores({
      activos:
        '++id, codigo_nuevo, codigo_antiguo, raf, centro_costo, area, linea_productiva, estado_equipo, categoria, validado, sync_pendiente',
      fotos: '++id, activo_id, tipo',
    });
  }
}

export const db = new ReviAssetsDB();
