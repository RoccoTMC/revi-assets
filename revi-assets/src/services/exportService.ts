import type { Activo } from '../types';

const toRow = (a: Activo) => ({
  'Centro de Costo':        a.centro_costo,
  'Fecha Inventario':       a.fecha_inventario,
  'Nombre Equipo':          a.nombre_equipo,
  'Área':                   a.area,
  'Línea Productiva':       a.linea_productiva ?? '',
  'Periférico':             a.periferico ?? '',
  'Layout / Ubicación':     a.layout_ubicacion ?? '',
  'Marca':                  a.marca ?? '',
  'Modelo':                 a.modelo ?? '',
  'Año Fabricación':        a.anio ?? '',
  'N° Placa Antiguo (AF)':  a.codigo_antiguo ?? '',
  'RAF':                    a.raf ?? '',
  'Código AF Nuevo':        a.codigo_nuevo ?? '',
  'Categoría':              a.categoria ?? '',
  'Estado Equipo':          a.estado_equipo,
  'Validado':               a.validado ? 'Sí' : 'No',
  'Observaciones':          a.observaciones ?? '',
  'Fecha Registro':         a.fecha_registro,
  'Usuario Registro':       a.usuario_registro,
  'Última Modificación':    a.fecha_ultima_mod,
});

export const exportToCSV = (activos: Activo[], filename = 'REVI_Assets') => {
  const rows = activos.map(toRow);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row =>
      headers.map(key => {
        const val = String(row[key as keyof typeof row] ?? '');
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
