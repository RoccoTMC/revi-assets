import * as XLSX from 'xlsx';
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

export const exportToExcel = (activos: Activo[], filename = 'REVI_Assets') => {
  const data = activos.map(toRow);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario AF');

  if (data.length > 0) {
    ws['!cols'] = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key as keyof typeof row] ?? '').length)),
    }));
  }

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToCSV = (activos: Activo[], filename = 'REVI_Assets') => {
  const data = activos.map(toRow);
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
