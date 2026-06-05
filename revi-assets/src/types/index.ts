export type EstadoEquipo =
  | 'NUEVO'
  | 'USADO'
  | 'MAL ESTADO'
  | 'FUERA DE USO'
  | 'CHATARRA (DESCARTE)';

export type TipoFoto = 'principal' | 'detalle' | 'placa' | 'ubicacion';

export interface Activo {
  id?: string;              // UUID (servidor)
  codigo_nuevo?: string;
  codigo_antiguo?: string;
  raf?: string;
  nombre_equipo: string;
  descripcion?: string;
  categoria?: string;
  centro_costo: string;
  area: string;
  linea_productiva?: string;
  periferico?: string;
  layout_ubicacion?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  estado_equipo: EstadoEquipo;
  responsable?: string;
  fecha_inventario: string;
  observaciones?: string;
  fecha_registro: string;
  usuario_registro: string;
  fecha_ultima_mod: string;
  validado: boolean;
  sync_pendiente: boolean;
  tiene_foto?: boolean;     // calculado por el servidor
  fotos?: FotoMeta[];
}

export interface FotoMeta {
  id: string;
  tipo: TipoFoto;
  orden: number;
  fecha: string;
}

export interface Foto {
  id?: string;
  activo_id: string;
  imagen_data: string;
  orden: number;
  fecha: string;
  tipo: TipoFoto;
}
