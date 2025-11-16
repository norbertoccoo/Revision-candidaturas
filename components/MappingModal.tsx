
import React, { useState, useEffect } from 'react';
// FIX: Import MappingSuggestion from the central types file.
import type { MappingSuggestion } from '../types';
import { SimpleSpinnerIcon } from './Icon';

interface MappingModalProps {
  isOpen: boolean;
  onConfirm: (finalMappings: MappingSuggestion[]) => void;
  onSkip: () => void;
  initialSuggestions: MappingSuggestion[];
}

const IDEAL_HEADERS = ['nombre', 'apellidos', 'dni', 'centro', 'fecha_antiguedad', 'ignorar'];

export const MappingModal: React.FC<MappingModalProps> = ({ isOpen, onConfirm, onSkip, initialSuggestions }) => {
  const [mappings, setMappings] = useState<MappingSuggestion[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMappings(initialSuggestions);
    }
  }, [isOpen, initialSuggestions]);

  if (!isOpen) {
    return null;
  }
  
  const handleMappingChange = (originalHeader: string, newSuggested: string) => {
    setMappings(currentMappings => 
      currentMappings.map(m => 
        m.original === originalHeader ? { ...m, suggested: newSuggested } : m
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-2 text-gray-800">Mapeo de Columnas Asistido por IA</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Hemos analizado las columnas de tu archivo. Por favor, revisa y confirma las asignaciones para asegurar que los datos se procesen correctamente.
        </p>

        <div className="flex-grow overflow-y-auto border-t border-b border-gray-200 py-4 -mx-6 px-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-semibold text-sm text-gray-600 px-4 pb-2 border-b">
            <div>Columna Original (de tu archivo)</div>
            <div>Asignar a (esquema ideal)</div>
          </div>
          <div className="space-y-3 pt-3">
             {mappings.length > 0 ? (
                mappings.map(({ original, suggested }) => (
                  <div key={original} className="grid grid-cols-2 gap-x-4 items-center px-4 py-2 rounded-md hover:bg-gray-50">
                    <span className="font-medium text-gray-900 truncate" title={original}>{original}</span>
                    <select
                      value={suggested}
                      onChange={(e) => handleMappingChange(original, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      aria-label={`Mapeo para la columna ${original}`}
                    >
                      {/* Muestra las cabeceras ideales más el valor original si no está en la lista */}
                      {[...new Set([...IDEAL_HEADERS, suggested])].sort().map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
             ) : (
                <div className="flex justify-center items-center py-8">
                  <SimpleSpinnerIcon className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-4 text-gray-700">Analizando cabeceras...</span>
                </div>
             )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:space-x-3 flex-shrink-0">
          <button
            onClick={onSkip}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
          >
            Usar Cabeceras Originales
          </button>
          <button
            onClick={() => onConfirm(mappings)}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            disabled={mappings.length === 0}
          >
            Confirmar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
