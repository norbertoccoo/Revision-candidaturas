
import React, { useState, useEffect, useCallback, useRef, useTransition, useDeferredValue } from 'react';
import type { TableRow } from './types';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { Spinner } from './components/Spinner';
import { DateModal } from './components/DateModal';
import { DuplicatesModal } from './components/DuplicatesModal';
import { Report } from './components/Report';
import { SupermarketBackground } from './components/SupermarketBackground';
import { parseFile } from './services/fileParser';
import { saveState, loadState, AppState, clearState } from './services/db';
import { SearchIcon, SettingsIcon, UsersIcon, ExportIcon, UploadIcon, ExcelIcon, CSVIcon, SimpleSpinnerIcon } from './components/Icon';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

type View = 'upload' | 'data' | 'report' | 'loading';

/**
 * Normaliza un texto: lo convierte a minúsculas, le quita tildes y signos de puntuación.
 * Esto hace que las comparaciones de texto sean insensibles a mayúsculas, acentos y puntuación.
 * @param text El texto a normalizar.
 * @returns El texto normalizado.
 */
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize("NFD") // Separa los caracteres base de los diacríticos (tildes)
    .replace(/[\u0300-\u036f]/g, "") // Elimina los diacríticos
    .toLowerCase() // Convierte a minúsculas
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ""); // Elimina puntuación común
};


const App: React.FC = () => {
    // State management
    const [isPending, startTransition] = useTransition();
    const [view, setView] = useState<View>('loading');
    const [fileName, setFileName] = useState<string>('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [originalData, setOriginalData] = useState<{ row: TableRow, originalIndex: number }[]>([]);
    const [searchableData, setSearchableData] = useState<{ searchableString: string, originalIndex: number }[]>([]);
    const [filteredData, setFilteredData] = useState<{ row: TableRow, originalIndex: number }[]>([]);
    const [checkedState, setCheckedState] = useState<Record<number, Record<string, boolean>>>({});
    const [allUnions, setAllUnions] = useState<string[]>(['CCOO', 'UGT', 'SB', 'SITCA', 'OTRO']);
    const [visibleUnions, setVisibleUnions] = useState<string[]>(['CCOO', 'UGT']);
    const [electionDates, setElectionDates] = useState({ submissionDate: '', votingDate: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [error, setError] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Modal states
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
    
    // Export dropdown state
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    
    // Base64 encoded logo image from the last working version
    const dinosolLogoSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAARgSURBVHgB7ZxdctowEIb/c2d3sks3SS+dNE8Qe4LME2SOkDhB4gQZJzB7gswT5J/gnCC7BXeSS+eSXbZjp1y0gBCkge044gX8+DP8gQcQ8P1+gwRS5B8sQcSCHC+yJAXJ9/MkycuwLOu6rhRFEb2mG10mSRIsy3Ke5ylJEhiGQRzHYIzRNE2MMbquY4wZY4wxURQFmqaBMAwZY0QxRhimaU3TtDGGURQRx3GcPM/jOEbTNJIk4XmeqKoKx3GgqipUVSWGYSAMA5IkwTAMtG2bNE0xxlXVSJIEXTfx3E+SpFmWtW1bjuN4nqeqqjRNQ+I4GIbBNE3HcdI0Ddd14jgOx3GgqgqCIGRZlmEYxlhdk2VZNE3DMAySJEEQBCEIgiAIuq5ZlsUYYIyBaZqmaRDGIK7rhmEAEISI4zhpmobneZquSRRFURQURSEMY5qmSZKE4ziMMbquURRFUZTmecYYmqZBURSMMTzP0zSN4zhFUYRhGNquY4wRRZGIoghjDMMwmqbBMAyMMWiahmVZFEXRNE3GGGEYYIwxxv8LpmnGGGEY0jSNoijo+v9aVdXv53mepmmMMWEYkqSJruvYtm2aplEUhaIoeJ4nx3EUReG6rqIoNE3DMAzq+v9bVXXbtmmaxpIkjuOo6zpOkoRiGMYYPM/DMAxpmvR9n7Zt0zQNgiBSFIUxxtM0URTlui5FUbquURRFUZTmecYYmqZBURSMMTzP0zSN4zhFUYRhGNquY4wRRZGIoghjDMMwmqbBMAyMMWiahmVZFEXRNE3GGGEYYIwxxv8LpmnGGGEY0jSNoijo+v9aVdXv53mepmmMMWEYkqSJruvYtm2aplEUhaIoeJ4nx3EUReG6rqIoNE3DMAzq+v9bVXXbtmmaxpIkjuOo6zpOkoRiGMYYPM/DMAxpmvR9n7Zt0zQNgiBSFIUxxtM0URTlui5FUbquURRFUZTmecYYmqZBURSMMTzP0zSN4zhFUYRhGNquY4wRRZGIoghjDMMwmqbBMAyMMWiahmVZFEXRNE3GGGEYYIwxxv8LpmnGGGEY0jSNoijo+v9aVdXv53mepmmMMWEYkqSJruvYtm2aplEUhaIoeJ4nx3EUReG6rqIoNE3DMAzq+v9bVXXbtmmaxpIkjuOo6zpOkoRiGMYYPM/DMAxpmvR9n7Zt0zQNgiBSFIUxxtM0URTlui5FUbquURRFUZTmecYYmqZBURSMMTzP0zSN4zhFUYRhGNquY4wRRZGIoghjDMMwmqbBMAyMMWiahmVZFEXRNE3GGGEYYIwxxv8LpmnGGGEY0jSNoijo+v9aVdXv53mepmmMMWEYkqSJruvYtm2aplEUhaIoeJ4nx3EUReG6l+3/82l7/f8+M2a7/gH6f9++F3P15AAAAABJRU5ErkJggg==";

    // Load initial state from DB
    useEffect(() => {
        loadState().then(savedState => {
            if (savedState) {
                setHeaders(savedState.headers || []);
                const dataWithIndices = (savedState.data || []).map((row, index) => ({ row, originalIndex: index }));
                setOriginalData(dataWithIndices);
                setFilteredData(dataWithIndices);
                setCheckedState(savedState.checkedState || {});
                setElectionDates(savedState.settings?.dates || { submissionDate: '', votingDate: '' });
                setVisibleUnions(savedState.settings?.unions || ['CCOO', 'UGT']);
                setFileName(savedState.fileName || '');
                setView('data');
            } else {
                setView('upload');
            }
        }).catch(() => {
            setError('No se pudo cargar el estado guardado. Por favor, carga un archivo nuevo.');
            setView('upload');
        });
    }, []);

    // Effect for handling clicks outside the export menu
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
          setIsExportMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Pre-process data for faster searching
    useEffect(() => {
        const processed = originalData.map(({ row, originalIndex }) => ({
            searchableString: normalizeText(Object.values(row).join(' ')),
            originalIndex
        }));
        setSearchableData(processed);
    }, [originalData]);

    // Filter data based on search term (multi-filter) - OPTIMIZED
    useEffect(() => {
        const normalizedSearch = normalizeText(deferredSearchTerm);
        const searchTerms = normalizedSearch.split(' ').filter(term => term.trim() !== '');

        if (searchTerms.length === 0) {
            setFilteredData(originalData);
            return;
        }

        // Fast filtering using pre-processed searchable strings
        const filteredIndexes = new Set(
            searchableData
                .filter(({ searchableString }) => searchTerms.every(term => searchableString.includes(term)))
                .map(item => item.originalIndex)
        );

        const filtered = originalData.filter(({ originalIndex }) => filteredIndexes.has(originalIndex));
        
        setFilteredData(filtered);
    }, [deferredSearchTerm, originalData, searchableData]);
    
    // Save state whenever critical data changes
    const saveDataToDB = useCallback(() => {
        if (headers.length > 0 && originalData.length > 0) {
            const stateToSave: AppState = {
                headers,
                data: originalData.map(d => d.row),
                checkedState,
                settings: {
                    dates: electionDates,
                    unions: visibleUnions,
                },
                fileName,
            };
            saveState(stateToSave);
        }
    }, [headers, originalData, checkedState, electionDates, visibleUnions, fileName]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
             saveDataToDB();
        }, 500); // Debounce saving
        return () => clearTimeout(timeoutId);
    }, [checkedState, electionDates, visibleUnions, saveDataToDB]);

    // Handlers
    const handleFileSelect = async (file: File) => {
        setView('loading');
        setError(null);
        try {
            await clearState(); // Clear old data before processing new file
            const { headers: parsedHeaders, data: parsedData } = await parseFile(file);

            setHeaders(parsedHeaders);
            const dataWithIndices = parsedData.map((row, index) => ({ row, originalIndex: index }));
            setOriginalData(dataWithIndices);
            setFilteredData(dataWithIndices);
            setCheckedState({});
            setFileName(file.name);
            
            // Save initial state of new file
            const initialState: AppState = {
                headers: parsedHeaders,
                data: parsedData,
                checkedState: {},
                settings: { dates: electionDates, unions: visibleUnions },
                fileName: file.name
            };
            await saveState(initialState);
            setView('data');
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setError(errorMessage);
            setView('upload');
        }
    };
    
    const handleCheckboxChange = useCallback((rowIndex: number, union: string, isChecked: boolean) => {
        // By wrapping the slow state update in a transition, we tell React
        // that it's okay to delay this render to keep the UI responsive.
        startTransition(() => {
            setCheckedState(prevState => ({
                ...prevState,
                [rowIndex]: {
                    ...prevState[rowIndex],
                    [union]: isChecked,
                },
            }));
        });
        
        // These updates are urgent and will happen immediately,
        // making the app feel fast.
        setSearchTerm('');
        searchInputRef.current?.focus();
    }, []);
    
    const handleSaveSettings = (settings: {
        dates: { submissionDate: string; votingDate: string };
        unions: string[];
    }) => {
        setElectionDates(settings.dates);
        setVisibleUnions(settings.unions);
        setIsDateModalOpen(false);
        saveDataToDB();
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleClearAndUpload = async () => {
        await clearState();
        setHeaders([]);
        setOriginalData([]);
        setFilteredData([]);
        setCheckedState({});
        setFileName('');
        setSearchTerm('');
        setError(null);
        setView('upload');
    };
    
    const exportData = (format: 'xlsx' | 'csv') => {
        if (isExporting) return;
        setIsExporting(true);

        setTimeout(() => {
            try {
              const dataToExport = originalData.map(({ row, originalIndex }) => {
                const newRow: TableRow = { ...row };
                visibleUnions.forEach(union => {
                  newRow[union] = checkedState[originalIndex]?.[union] ? 'VERDADERO' : 'FALSO';
                });
                return newRow;
              });
        
              const allHeaders = [...headers, ...visibleUnions];
              const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: allHeaders });
        
              if (format === 'xlsx') {
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos Verificados');
                XLSX.writeFile(workbook, `verificado_${fileName.split('.')[0]}.xlsx`);
              } else {
                const csvOutput = Papa.unparse(dataToExport, { header: true, columns: allHeaders });
                const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `verificado_${fileName.split('.')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            } catch (e) {
                console.error("Error al exportar:", e);
                setError("Ocurrió un error durante la exportación.");
            } finally {
                setIsExporting(false);
                setIsExportMenuOpen(false);
            }
        }, 100); // Short delay to allow UI update
    };

    // Button classes
    const btnBase = "font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out shadow-sm transform hover:-translate-y-px hover:shadow-lg text-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const btnSecondary = `${btnBase} bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary`;
    const btnPrimary = `${btnBase} bg-[#D97D55] hover:bg-[#C36F4A] text-white border border-transparent focus-visible:ring-[#D97D55]`;

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return <Spinner message="Cargando datos..." />;
            case 'upload':
                return (
                    <div className="text-center">
                        <img src={dinosolLogoSrc} alt="Logo de Dinosol" className="w-24 h-24 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Verificador de Candidaturas</h1>
                        <p className="text-secondary-light mb-8 max-w-lg mx-auto">Sube tu archivo de censo para verificar y gestionar las candidaturas para las elecciones sindicales.</p>
                        <FileUpload onFileSelect={handleFileSelect} />
                        {error && <p className="mt-4 text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    </div>
                );
            case 'data':
                return (
                    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                        <header className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50/70">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <img src={dinosolLogoSrc} alt="Logo de Dinosol" className="w-10 h-10" />
                                </div>

                                <div className="flex-grow flex items-center justify-center min-w-0">
                                    <div className="relative w-full lg:w-auto lg:max-w-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <SearchIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Buscar en la tabla..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-4 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                    <button onClick={handleClearAndUpload} className={btnSecondary} title="Cargar Nuevo Archivo">
                                        <UploadIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">Cargar Nuevo</span>
                                    </button>
                                    <button onClick={() => setIsDateModalOpen(true)} className={btnSecondary} title="Configuración">
                                        <SettingsIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">Configuración</span>
                                    </button>
                                    <button onClick={() => setIsDuplicatesModalOpen(true)} className={btnSecondary} title="Ver Duplicados">
                                        <UsersIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">Duplicados</span>
                                    </button>
                                    
                                    <div className="relative" ref={exportMenuRef}>
                                        <button onClick={() => setIsExportMenuOpen(prev => !prev)} disabled={isExporting} className={btnSecondary} title="Exportar Datos">
                                            {isExporting ? <SimpleSpinnerIcon className="w-5 h-5 animate-spin" /> : <ExportIcon className="w-5 h-5" />}
                                            <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                                        </button>
                                        {isExportMenuOpen && (
                                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 animate-fade-in-down">
                                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                                    <button onClick={() => exportData('xlsx')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                                        <ExcelIcon className="w-5 h-5 text-green-600" />
                                                        <span>Exportar a Excel</span>
                                                    </button>
                                                    <button onClick={() => exportData('csv')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                                        <CSVIcon className="w-5 h-5 text-blue-600" />
                                                        <span>Exportar a CSV</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setView('report')} className={btnPrimary}>
                                        Generar Informe
                                    </button>
                                </div>
                            </div>
                        </header>
                        <main className="flex-grow overflow-y-auto">
                            <DataTable
                                headers={headers}
                                data={filteredData}
                                unions={visibleUnions}
                                checkedState={checkedState}
                                onCheckboxChange={handleCheckboxChange}
                            />
                        </main>
                    </div>
                );
            case 'report':
                return (
                    <Report 
                        data={originalData.map(d => d.row)}
                        checkedState={checkedState}
                        allUnions={allUnions}
                        electionDates={electionDates}
                        onBack={() => setView('data')}
                    />
                );
        }
    };

    return (
        <>
            <SupermarketBackground />
            <div className={`relative min-h-screen w-full flex ${view === 'data' || view === 'report' ? 'items-stretch' : 'items-center'} justify-center p-2 sm:p-4 lg:p-6 font-sans z-10`}>
                {renderContent()}
            </div>

            <DateModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSave={handleSaveSettings}
                currentDates={electionDates}
                allUnions={allUnions}
                currentVisibleUnions={visibleUnions}
            />
            
            <DuplicatesModal
                isOpen={isDuplicatesModalOpen}
                onClose={() => setIsDuplicatesModalOpen(false)}
                data={originalData.map(d => d.row)}
                unions={visibleUnions}
                checkedState={checkedState}
            />
        </>
    );
};

export default App;
