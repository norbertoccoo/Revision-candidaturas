import React, { useRef, useState, useLayoutEffect, useMemo } from 'react';
import type { TableRow } from '../types';
import { SearchIcon } from './Icon';

interface DataTableProps {
  headers: string[];
  data: { row: TableRow; originalIndex: number }[];
  unions: string[];
  checkedState: Record<number, Record<string, boolean>>;
  onCheckboxChange: (rowIndex: number, union: string, isChecked: boolean) => void;
}

// Returns Tailwind CSS accent-color classes for styling the checkbox background itself.
const getUnionCheckboxAccentColor = (union: string): string => {
  switch (union.toUpperCase()) {
    case 'CCOO':
      return 'accent-red-300'; // Rojo pastel claro
    case 'UGT':
      return 'accent-blue-300'; // Azul pastel claro
    case 'SB':
      return 'accent-orange-300'; // Naranja pastel claro
    case 'SITCA':
      return 'accent-violet-300'; // Lila pastel claro
    default: // OTRO
      return 'accent-yellow-300'; // Amarillo pastel claro
  }
};

const ROW_HEIGHT = 57; // Altura estimada de la fila en píxeles. Crítico para los cálculos de virtualización.
const OVERSCAN_COUNT = 5; // Número de filas a renderizar por encima y por debajo del área visible.
const UNION_COL_WIDTH = 80; // Ancho fijo para las columnas de sindicatos

/**
 * Determina el ancho de una columna de datos basado en su cabecera.
 * @param header El texto de la cabecera de la columna.
 * @returns El ancho en píxeles.
 */
const getDataColumnWidth = (header: string): number => {
  const normalizedHeader = header.toLowerCase();
  
  if (normalizedHeader.includes('nombre') || normalizedHeader.includes('apellidos') || normalizedHeader.includes('candidato')) {
    return 280; // Más ancho para nombres completos
  }
  if (normalizedHeader.includes('centro')) {
    return 250; // Ancho para el centro de trabajo
  }
  if (normalizedHeader.includes('dni') || normalizedHeader.includes('nif')) {
    return 120; // Estrecho para identificadores
  }
  if (normalizedHeader.includes('fecha') || normalizedHeader.includes('antigüedad')) {
    return 140; // Ancho para fechas
  }
  // Ancho por defecto para otras columnas
  return 160; 
};

// Helper to find likely name/identifier columns
const getCandidateIdentifier = (row: TableRow): string => {
    const nameKeys = Object.keys(row).filter(k => /nombre|apellidos|name/i.test(k));
    if (nameKeys.length > 0) {
        return nameKeys.map(k => row[k]).join(' ').trim();
    }
    // Fallback to the first non-empty value if no name-like key is found
    return String(Object.values(row).find(v => v) ?? 'Candidato Desconocido');
}

interface DataRowProps {
  row: TableRow;
  originalIndex: number;
  headers: string[];
  unions: string[];
  rowCheckedState: Record<string, boolean> | undefined;
  onCheckboxChange: (rowIndex: number, union: string, isChecked: boolean) => void;
  isEven: boolean;
}

// Componente de Fila Memoizado para un rendimiento óptimo.
// Solo se volverá a renderizar si sus props específicas cambian.
const DataRow: React.FC<DataRowProps> = React.memo(({
  row,
  originalIndex,
  headers,
  unions,
  rowCheckedState,
  onCheckboxChange,
  isEven
}) => {
  return (
    <tr className={`${isEven ? 'bg-white' : 'bg-gray-50/70'} hover:bg-green-50 transition-colors duration-150 border-b border-gray-200`} style={{ height: `${ROW_HEIGHT}px` }}>
      {unions.map((union) => (
        <td key={union} className="px-4 py-4 sticky left-0 bg-inherit transition-colors duration-150 whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: `${UNION_COL_WIDTH}px` }}>
            <input
                type="checkbox"
                className={`h-5 w-5 rounded border-gray-400 focus:ring-primary ${getUnionCheckboxAccentColor(union)}`}
                checked={rowCheckedState?.[union] ?? false}
                onChange={(e) => onCheckboxChange(originalIndex, union, e.target.checked)}
                aria-label={`Marcar ${getCandidateIdentifier(row)} para ${union}`}
            />
        </td>
      ))}
      {headers.map((header, colIndex) => (
        <td key={`${originalIndex}-${colIndex}`} className="px-6 py-4 text-sm text-secondary break-words whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: `${getDataColumnWidth(header)}px` }}>
          {String(row[header] ?? '')}
        </td>
      ))}
    </tr>
  );
});

export const DataTable: React.FC<DataTableProps> = React.memo(({ headers, data, unions, checkedState, onCheckboxChange }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Efecto para calcular el rango visible inicial basado en la altura del contenedor
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const { clientHeight } = scrollContainerRef.current;
      const initialItemCount = Math.ceil(clientHeight / ROW_HEIGHT);
      const initialEnd = Math.min(data.length, initialItemCount + OVERSCAN_COUNT * 2);
      setVisibleRange({ start: 0, end: initialEnd });
    }
  }, [data.length]);

  // Manejador para el evento de scroll en el contenedor
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = e.currentTarget;
    const newStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
    const newEnd = Math.min(data.length, Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN_COUNT);

    if (newStart !== visibleRange.start || newEnd !== visibleRange.end) {
      setVisibleRange({ start: newStart, end: newEnd });
    }
  };

  // Memoizar el cálculo de los elementos a renderizar y las alturas de relleno
  const { topPadding, bottomPadding, itemsToRender } = useMemo(() => {
    const top = visibleRange.start * ROW_HEIGHT;
    const bottom = Math.max(0, (data.length - visibleRange.end) * ROW_HEIGHT);
    const items = data.slice(visibleRange.start, visibleRange.end);
    return {
      topPadding: top,
      bottomPadding: bottom,
      itemsToRender: items,
    };
  }, [data, visibleRange]);
  
  // Calcular el ancho total de la tabla dinámicamente
  const totalWidth = useMemo(() => {
    const unionsWidth = unions.length * UNION_COL_WIDTH;
    const dataWidth = headers.reduce((sum, header) => sum + getDataColumnWidth(header), 0);
    return unionsWidth + dataWidth;
  }, [unions, headers]);


  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-secondary-light p-10 bg-white rounded-lg">
        <SearchIcon className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-xl font-semibold text-secondary">Sin Resultados</h3>
        <p className="mt-1">No hay datos que coincidan con tu búsqueda.</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="w-full h-full overflow-auto bg-gray-50"
    >
      <table className="min-w-full" style={{ tableLayout: 'fixed', width: totalWidth }}>
        <thead className="bg-primary sticky top-0 z-10 border-b-2 border-primary-dark">
          <tr>
            {unions.map((union) => (
              <th
                key={union}
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider sticky left-0 bg-inherit"
                style={{ width: `${UNION_COL_WIDTH}px` }}
              >
                {union}
              </th>
            ))}
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ width: `${getDataColumnWidth(header)}px` }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {/* Fila espaciadora superior */}
          {topPadding > 0 && (
            <tr>
              <td colSpan={unions.length + headers.length} style={{ height: `${topPadding}px` }} />
            </tr>
          )}

          {/* Filas renderizadas */}
          {itemsToRender.map(({ row, originalIndex }, index) => (
             <DataRow
                key={originalIndex}
                row={row}
                originalIndex={originalIndex}
                headers={headers}
                unions={unions}
                rowCheckedState={checkedState[originalIndex]}
                onCheckboxChange={onCheckboxChange}
                isEven={index % 2 === 0}
            />
          ))}

          {/* Fila espaciadora inferior */}
          {bottomPadding > 0 && (
            <tr>
              <td colSpan={unions.length + headers.length} style={{ height: `${bottomPadding}px` }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});