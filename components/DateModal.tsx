
import React, { useState, useEffect } from 'react';

interface DateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: {
    dates: { submissionDate: string; votingDate: string };
    unions: string[];
  }) => void;
  currentDates: { submissionDate: string; votingDate: string };
  allUnions: string[];
  currentVisibleUnions: string[];
}

export const DateModal: React.FC<DateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentDates,
  allUnions,
  currentVisibleUnions,
}) => {
  const [submissionDate, setSubmissionDate] = useState('');
  const [votingDate, setVotingDate] = useState('');
  const [selectedUnions, setSelectedUnions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSubmissionDate(currentDates.submissionDate || '');
      setVotingDate(currentDates.votingDate || '');
      setSelectedUnions(currentVisibleUnions);
    }
  }, [isOpen, currentDates, currentVisibleUnions]);

  if (!isOpen) {
    return null;
  }

  const handleUnionToggle = (union: string) => {
    setSelectedUnions(prev =>
      prev.includes(union)
        ? prev.filter(u => u !== union)
        : [...prev, union]
    );
  };

  const handleSave = () => {
    onSave({ 
        dates: { submissionDate, votingDate },
        unions: selectedUnions,
    });
  };
  
  // Base button classes for professional styling
  const btnBase = "w-full sm:w-auto font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out shadow-sm transform hover:-translate-y-px hover:shadow-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const btnSecondary = `${btnBase} bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary`;
  const btnPrimary = `${btnBase} bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 w-11/12 max-w-md max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-2xl font-bold mb-6 text-gray-800">Configuración</h2>
        
        <div className="space-y-6">
          {/* Sección de Fechas */}
          <fieldset>
              <legend className="text-lg font-semibold mb-3 text-gray-700">Fechas Electorales</legend>
              <div className="space-y-4">
                <div>
                  <label htmlFor="submissionDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Presentación de candidaturas
                  </label>
                  <input
                    type="date"
                    id="submissionDate"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="votingDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de votación
                  </label>
                  <input
                    type="date"
                    id="votingDate"
                    value={votingDate}
                    onChange={(e) => setVotingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
          </fieldset>
          
          {/* Sección de Sindicatos */}
          <fieldset>
            <legend className="text-lg font-semibold mb-3 text-gray-700">Sindicatos Visibles</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {allUnions.map((union) => (
                <div key={union} className="flex items-center">
                  <input
                    id={`union-checkbox-${union}`}
                    type="checkbox"
                    checked={selectedUnions.includes(union)}
                    onChange={() => handleUnionToggle(union)}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor={`union-checkbox-${union}`} className="ml-3 block text-sm font-medium text-gray-700">
                    {union}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:space-x-3 border-t border-gray-200 pt-6">
          <button
            onClick={onClose}
            className={btnSecondary}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={btnPrimary}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
