import React, { useMemo } from 'react';
import type { TableRow } from '../types';
import { PDFIcon, WordIcon } from './Icon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface ReportProps {
  data: TableRow[];
  checkedState: Record<number, Record<string, boolean>>;
  allUnions: string[];
  electionDates: { submissionDate: string; votingDate: string };
  onBack: () => void;
}

// Helper to find columns with names/identifiers and create an identifier ORDENABLE
const getCandidateIdentifier = (row: TableRow): string => {
    const keys = Object.keys(row);
    // Busca columnas de apellidos y nombre, priorizando apellidos para la ordenación
    const surnameKeys = keys.filter(k => /apellidos/i.test(k)).sort();
    const nameKeys = keys.filter(k => /nombre/i.test(k) && !/apellidos/i.test(k)).sort();
    
    let fullNameParts: string[] = [];

    if (surnameKeys.length > 0) {
        fullNameParts.push(...surnameKeys.map(k => String(row[k] ?? '')));
    }
    if (nameKeys.length > 0) {
        fullNameParts.push(...nameKeys.map(k => String(row[k] ?? '')));
    }
    
    if (fullNameParts.length > 0) {
        return fullNameParts.join(' ').trim();
    }

    // Fallback: si no se encuentran columnas específicas, une todas las que parezcan de nombre
    const allNameKeys = keys.filter(k => /nombre|apellidos|name|candidato/i.test(k)).sort();
    if (allNameKeys.length > 0) {
        return allNameKeys.map(k => String(row[k] ?? '')).join(' ').trim();
    }

    const dniKey = keys.find(k => /dni|nif|id/i.test(k));
    if (dniKey) {
        return String(row[dniKey]);
    }
    
    // Fallback final a la primera columna
    return String(Object.values(row)[0] ?? 'Candidato Desconocido');
}

// Formatear fecha para mostrarla amigablemente
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'No especificada';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString; // Fallback por si el formato no es YYYY-MM-DD
    }
};

export const Report: React.FC<ReportProps> = ({ data, checkedState, allUnions, electionDates, onBack }) => {

  const duplicatedCandidatesByUnion = useMemo(() => {
    // 1. Map all candidates to the unions they are checked for.
    const candidatesMap: Map<string, { unions: Set<string>, row: TableRow }> = new Map();
    data.forEach((row, rowIndex) => {
        const checkedUnionsForRow = allUnions.filter(union => checkedState[rowIndex]?.[union]);
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
            row: candidate.row
        }));
    
    // 3. Group these duplicates by each union they are part of.
    const groupedByUnion: Record<string, { identifier: string; otherUnions: string[], row: TableRow }[]> = {};

    allUnions.forEach(union => {
      const candidatesInThisUnion = actualDuplicates
        .filter(dup => dup.unions.includes(union))
        .map(dup => ({
          identifier: dup.identifier,
          otherUnions: dup.unions.filter(u => u !== union),
          row: dup.row
        }));

      if (candidatesInThisUnion.length > 0) {
          // Sort candidates alphabetically within this union's list
          candidatesInThisUnion.sort((a, b) => a.identifier.localeCompare(b.identifier));
          groupedByUnion[union] = candidatesInThisUnion;
      }
    });

    return groupedByUnion;
  }, [data, checkedState, allUnions]);
  
  const hasDuplicates = Object.keys(duplicatedCandidatesByUnion).length > 0;
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 20;

    // Cabecera del documento
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe de Candidaturas Duplicadas', pageWidth / 2, startY, { align: 'center' });
    startY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Dinosol Supermercados', pageWidth / 2, startY, { align: 'center' });
    startY += 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, startY, { align: 'center' });
    startY += 6;
    doc.setLineWidth(0.5);
    doc.line(20, startY, pageWidth - 20, startY);
    startY += 10;
    
    // Sección de Fechas Clave
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text('Fechas Clave', 20, startY);
    startY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Presentación de candidaturas: ${formatDisplayDate(electionDates.submissionDate)}`, 22, startY);
    startY += 6;
    doc.text(`Fecha de votación: ${formatDisplayDate(electionDates.votingDate)}`, 22, startY);
    startY += 12;
    
    // Sección de Duplicados
    if (hasDuplicates) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Candidatos en Múltiples Sindicatos', 20, startY);
      startY += 10;
      
      // FIX: Cast the result of Object.entries to provide a specific type for `candidates`, resolving the error on `candidates.map`.
      (Object.entries(duplicatedCandidatesByUnion) as [string, { identifier: string; otherUnions: string[], row: TableRow }[]][]).forEach(([union, candidates], index) => {
        if (index > 0) startY += 5; // Add space between tables
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.text(`Sindicato: ${union}`, 20, startY);
        startY += 8;

        const tableColumns = ["Candidato", "También Presentado En"];
        const tableBody = candidates.map(candidate => [
            candidate.identifier,
            candidate.otherUnions.join(', ')
        ]);

        autoTable(doc, {
          head: [tableColumns],
          body: tableBody,
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [93, 134, 108] }, // #5D866C
          didDrawPage: (data) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(
              `Página ${data.pageNumber} de ${pageCount}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10
            );
          },
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
      });
    } else {
      doc.setFontSize(12);
      doc.text('No se han encontrado candidatos en múltiples sindicatos.', 20, startY);
    }

    doc.save('informe_candidaturas_duplicadas.pdf');
  };
  
  const handleExportWord = () => {
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; font-size: 11pt; }
                h1 { font-size: 18pt; font-weight: bold; text-align: center; }
                h2 { font-size: 14pt; text-align: center; color: #555; }
                h3 { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px;}
                h4 { font-size: 12pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
                p { margin: 5px 0; }
                .header-info { text-align: center; color: #888; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 5px; margin-bottom: 20px; }
                th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Informe de Candidaturas Duplicadas</h1>
            <h2>Dinosol Supermercados</h2>
            <p class="header-info">Generado el: ${new Date().toLocaleDateString('es-ES')}</p>

            <h3>Fechas Clave</h3>
            <p><strong>Presentación de candidaturas:</strong> ${formatDisplayDate(electionDates.submissionDate)}</p>
            <p><strong>Fecha de votación:</strong> ${formatDisplayDate(electionDates.votingDate)}</p>
    `;

    if (hasDuplicates) {
        htmlContent += '<h3>Candidatos en Múltiples Sindicatos</h3>';
        
        // FIX: Cast the result of Object.entries to provide a specific type for `candidates`, resolving the error on `candidates.forEach`.
        (Object.entries(duplicatedCandidatesByUnion) as [string, { identifier: string; otherUnions: string[], row: TableRow }[]][]).forEach(([union, candidates]) => {
            htmlContent += `<h4>Sindicato: ${union}</h4>`;
            htmlContent += `
              <table>
                <thead>
                    <tr>
                        <th>Candidato</th>
                        <th>También Presentado En</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            candidates.forEach(candidate => {
                htmlContent += `
                    <tr>
                        <td>${candidate.identifier}</td>
                        <td>${candidate.otherUnions.join(', ')}</td>
                    </tr>`;
            });
    
            htmlContent += '</tbody></table>';
        });
    } else {
        htmlContent += `
            <h3>Resumen</h3>
            <p>No se han encontrado candidatos en múltiples sindicatos.</p>
        `;
    }
    
    htmlContent += '</body></html>';
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlContent);
    const link = document.createElement('a');
    link.href = source;
    link.download = 'informe_candidaturas_duplicadas.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Base button classes for professional styling
  const btnBase = "font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out shadow-sm transform hover:-translate-y-px hover:shadow-lg text-sm flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const btnSecondary = `${btnBase} bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary`;
  const btnAction = `${btnBase} bg-primary hover:bg-primary-dark text-white border border-transparent focus-visible:ring-primary`;


  return (
    <div className="w-full h-full bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col font-sans">
      <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Informe de Duplicidades</h2>
          <p className="text-secondary-light mt-1">Resumen de candidatos en múltiples sindicatos, agrupados por lista.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onBack}
            className={btnSecondary}
          >
            Volver a la Tabla
          </button>
          <button
            onClick={handleDownloadPDF}
            className={btnAction}
          >
            <PDFIcon className="w-5 h-5" />
            PDF
          </button>
          <button
            onClick={handleExportWord}
            className={btnAction}
          >
            <WordIcon className="w-5 h-5" />
            Word
          </button>
        </div>
      </header>
      
      <main className="flex-grow overflow-y-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
        <section className="mb-8 p-6 border rounded-lg bg-gray-50/70">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Fechas Clave</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="font-medium text-gray-600">Presentación de candidaturas:</p>
                    <p className="font-mono text-gray-800">{formatDisplayDate(electionDates.submissionDate)}</p>
                </div>
                <div>
                    <p className="font-medium text-gray-600">Fecha de votación:</p>
                    <p className="font-mono text-gray-800">{formatDisplayDate(electionDates.votingDate)}</p>
                </div>
            </div>
        </section>

        {hasDuplicates ? (
          <section className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Candidatos en Múltiples Sindicatos</h3>
            {/* FIX: Cast the result of Object.entries to provide a specific type for `candidates`, resolving errors on `candidates.length` and `candidates.map`. */}
            {(Object.entries(duplicatedCandidatesByUnion) as [string, { identifier: string; otherUnions: string[], row: TableRow }[]][]).map(([union, candidates]) => (
                <div key={union} className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-yellow-800 mb-3">{union} ({candidates.length} encontrados)</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border">
                          <thead className="bg-gray-100">
                              <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      Candidato
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      También Presentado En
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {candidates.map((candidate, index) => (
                                  <tr key={`${candidate.identifier}-${index}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {candidate.identifier}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                          {candidate.otherUnions.join(', ')}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                </div>
            ))}
          </section>
        ) : (
          <section className="text-center text-secondary-light py-16">
            <h3 className="text-xl font-semibold">No se han encontrado duplicados</h3>
            <p className="mt-2">Ningún candidato ha sido seleccionado en más de un sindicato.</p>
          </section>
        )}
      </main>
    </div>
  );
};