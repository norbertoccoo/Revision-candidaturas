import React, { useMemo } from 'react';
import type { TableRow } from '../types';

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TableRow[];
  unions: string[];
  checkedState: Record<number, Record<string, boolean>>;
}

// Helper to find likely name/identifier columns
const getCandidateIdentifier = (row: TableRow): string => {
    const nameKeys = Object.keys(row).filter(k => /nombre|apellidos|name/i.test(k));
    if (nameKeys.length > 0) {
        return nameKeys.map(k => row[k]).join(' ').trim();
    }
    // Fallback to the first non-empty value if no name-like key is found
    return String(Object.values(row).find(v => v) ?? 'Candidato Desconocido');
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ isOpen, onClose, data, unions, checkedState }) => {
  if (!isOpen) {
    return null;
  }

  const duplicatedCandidatesByUnion = useMemo(() => {
    // 1. Map all candidates to the unions they are checked for.
    const candidatesMap: Map<string, { unions: Set<string>, row: TableRow }> = new Map();
    data.forEach((row, rowIndex) => {
        const checkedUnionsForRow = unions.filter(union => checkedState[rowIndex]?.[union]);
        if (checkedUnionsForRow.length > 0) {
            const identifier = getCandidateIdentifier(row);
            if (!candidatesMap.has(identifier)) {
                candidatesMap.set(identifier, { unions: new Set(), row });
            }
            checkedUnionsForRow.forEach(union => candidatesMap.get(identifier)!.unions.add(union));
        }
    });

    // 2. Filter down to only those candidates who are in more than one union.
    const actualDuplicates = Array.from(candidatesMap.values())
        .filter(candidate => candidate.unions.size > 1)
        .map(candidate => ({
            identifier: getCandidateIdentifier(candidate.row),
            unions: Array.from(candidate.unions).sort(),
        }));
    
    // 3. Group these duplicates by each union they are part of.
    const groupedByUnion: Record<string, { identifier: string; otherUnions: string[] }[]> = {};

    unions.forEach(union => {
      const candidatesInThisUnion = actualDuplicates
        .filter(dup => dup.unions.includes(union))
        .map(dup => ({
          identifier: dup.identifier,
          otherUnions: dup.unions.filter(u => u !== union),
        }));

      if (candidatesInThisUnion.length > 0) {
          // Sort candidates alphabetically within this union's list
          candidatesInThisUnion.sort((a, b) => a.identifier.localeCompare(b.identifier));
          groupedByUnion[union] = candidatesInThisUnion;
      }
    });

    return groupedByUnion;
  }, [data, unions, checkedState]);

  const hasDuplicates = Object.keys(duplicatedCandidatesByUnion).length > 0;

  // Button class for professional styling
  const btnPrimary = "font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out shadow-sm transform hover:-translate-y-px hover:shadow-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicates-modal-title"
      >
        <h2 id="duplicates-modal-title" className="text-2xl font-bold mb-2 text-gray-800">Candidaturas Duplicadas</h2>
        <p className="text-secondary-light mb-6">
          A continuación se muestran los candidatos que figuran en varias listas, agrupados por sindicato.
        </p>

        <div className="flex-grow overflow-y-auto border-t border-gray-200 pt-4 -mx-6 px-6">
          {hasDuplicates ? (
            <div className="space-y-8">
              {/* FIX: Cast the result of Object.entries to provide a specific type for `candidates`, resolving the error on `candidates.map`. */}
              {(Object.entries(duplicatedCandidatesByUnion) as [string, { identifier: string; otherUnions: string[] }[]][]).map(([union, candidates]) => (
                <div key={union}>
                  <h3 className="text-xl font-semibold text-primary mb-3 px-6">{union}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Candidato
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  También presentado en
                              </th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {candidates.map((candidate, index) => (
                              <tr key={`${candidate.identifier}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {candidate.identifier}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {candidate.otherUnions.join(', ')}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center text-gray-500 py-10">
                <p>No se han encontrado duplicados entre las casillas marcadas.</p>
             </div>
          )}
        </div>

        <div className="mt-6 flex justify-end flex-shrink-0 border-t border-gray-200 pt-6">
          <button
            onClick={onClose}
            className={btnPrimary}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};