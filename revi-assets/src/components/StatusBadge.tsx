import type { EstadoEquipo } from '../types';

const COLORS: Record<EstadoEquipo, string> = {
  'NUEVO': 'bg-green-100 text-green-800',
  'USADO': 'bg-blue-100 text-blue-800',
  'MAL ESTADO': 'bg-yellow-100 text-yellow-800',
  'FUERA DE USO': 'bg-red-100 text-red-800',
  'CHATARRA (DESCARTE)': 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ estado }: { estado: EstadoEquipo }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${COLORS[estado]}`}
    >
      {estado}
    </span>
  );
}
