import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { TableRow } from '../types';

interface ParseResult {
  headers: string[];
  data: TableRow[];
}

/**
 * Formats a Date object into a DD-MM-YYYY string.
 * @param date The date to format.
 * @returns The formatted date string.
 */
function formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Iterates through data rows and formats any columns that look like dates into DD-MM-YYYY.
 * This function is robust and handles JS Date objects, Excel serial date numbers, and common string formats.
 * @param data The array of data rows.
 * @param headers The complete list of headers.
 * @returns The processed data with formatted dates.
 */
function processDataForDates(data: TableRow[], headers: string[]): TableRow[] {
    // Encuentra todas las cabeceras que probablemente contengan fechas.
    const dateHeaders = headers.filter(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('antigüedad'));

    // Si no hay columnas de fecha, devuelve los datos sin procesar.
    if (dateHeaders.length === 0) {
        return data;
    }

    return data.map(row => {
        const newRow = { ...row };
        for (const header of dateHeaders) {
            const originalValue = newRow[header];
            let date: Date | null = null;

            if (originalValue instanceof Date) {
                // El valor ya es un objeto Date (común desde Excel con cellDates: true)
                date = originalValue;
            } else if (typeof originalValue === 'number' && originalValue > 25569) {
                // Intenta convertir números de serie de fecha de Excel a Date.
                // 25569 es el número de días desde 1900-01-01 hasta 1970-01-01 (epoch de Unix)
                date = new Date((originalValue - 25569) * 86400 * 1000);
            } else if (typeof originalValue === 'string') {
                // Intenta parsear formatos de fecha comunes como DD/MM/YYYY o DD-MM-YYYY
                const parts = originalValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
                if (parts) {
                    const day = parseInt(parts[1], 10);
                    const month = parseInt(parts[2], 10) - 1; // El mes en JS es 0-indexed
                    let year = parseInt(parts[3], 10);
                    if (year < 100) { // Asume años de 2 dígitos como del siglo XXI
                        year += 2000;
                    }
                    date = new Date(year, month, day);
                } else {
                    // Como fallback, intenta el parseo nativo del navegador (para formatos ISO, etc.)
                    const parsedDate = new Date(originalValue);
                    // Solo usa el resultado si parece una fecha válida
                    if (!isNaN(parsedDate.getTime())) {
                        date = parsedDate;
                    }
                }
            }
            
            // Si se pudo parsear una fecha válida, formatéala. Si no, deja el valor original.
            if (date && !isNaN(date.getTime()) && date.getFullYear() > 1000) {
                newRow[header] = formatDate(date);
            }
        }
        return newRow;
    });
}


/**
 * Parses a file (CSV, JSON, XLSX, XLS) and returns its data as an array of objects.
 * @param file The file to parse.
 * @returns A promise that resolves with the headers and data from the file.
 */
export const parseFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    const processAndResolve = (data: TableRow[]) => {
        if (data.length === 0) {
            return resolve({ headers: [], data: [] });
        }
        // Scan all rows to get a complete set of headers, ensuring no columns are missed
        const allHeaders = Array.from(new Set(data.flatMap(row => Object.keys(row))));
        const processedData = processDataForDates(data, allHeaders);
        resolve({ headers: allHeaders, data: processedData });
    };

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            return reject(new Error(results.errors.map(e => e.message).join('\n')));
          }
          if (!results.data) {
            return resolve({ headers: [], data: [] });
          }
          const data = results.data.filter(row => 
            typeof row === 'object' && row !== null && !Object.values(row).every(val => val === null || val === '')
          ) as TableRow[];
          processAndResolve(data);
        },
        error: (error: Error) => {
          reject(new Error(`Error al parsear CSV: ${error.message}`));
        },
      });
    } else if (extension === 'json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (!event.target?.result) {
            return reject(new Error('No se pudo leer el archivo JSON.'));
          }
          const data = JSON.parse(event.target.result as string);
          if (!Array.isArray(data)) {
            return reject(new Error('El archivo JSON debe contener un array de objetos.'));
          }
          processAndResolve(data);
        } catch (e) {
          if (e instanceof Error) {
            reject(new Error(`JSON inválido: ${e.message}`));
          } else {
            reject(new Error('Error al parsear el archivo JSON.'));
          }
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (!event.target?.result) {
            return reject(new Error('No se pudo leer el archivo de Excel.'));
          }
          const workbook = XLSX.read(event.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            return reject(new Error('El archivo de Excel no contiene hojas.'));
          }
          const worksheet = workbook.Sheets[sheetName];
          // Use `cellDates: true` to correctly parse Excel date serial numbers into JS Date objects
          const data = XLSX.utils.sheet_to_json<TableRow>(worksheet, { cellDates: true });
          processAndResolve(data);
        } catch (e) {
          if (e instanceof Error) {
            reject(new Error(`Error al procesar el archivo de Excel: ${e.message}`));
          } else {
            reject(new Error('Ocurrió un error desconocido al procesar el archivo de Excel.'));
          }
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Tipo de archivo no soportado: .${extension}`));
    }
  });
};