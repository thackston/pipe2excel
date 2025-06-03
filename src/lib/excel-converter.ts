import * as XLSX from 'xlsx';

/**
 * Sanitizes a string to be used as an Excel sheet name.
 * - Replaces invalid characters: \ / ? * [ ] :
 * - Truncates to a maximum of 30 characters.
 * - Ensures the name is not empty, defaulting to "Sheet".
 * @param name The original name.
 * @returns A sanitized sheet name.
 */
function sanitizeSheetName(name: string): string {
  let sanitized = name.replace(/[\\/?*[\]:]/g, '_');
  if (sanitized.length > 30) {
    sanitized = sanitized.substring(0, 30);
  }
  if (sanitized.length === 0) {
    return 'Sheet';
  }
  // Excel disallows 'History' as a sheet name, case-insensitive
  if (sanitized.toLowerCase() === 'history') {
    return 'Sheet_History';
  }
  return sanitized;
}

/**
 * Converts an array of pipe-delimited text Files into an Excel Blob.
 * Each file becomes a new worksheet in the Excel file.
 * @param files An array of File objects.
 * @param delimiter The delimiter string to use for splitting lines (defaults to '|').
 * @returns A Promise that resolves with a Blob representing the .xlsx file.
 */
export async function convertPipeDelimitedToExcel(files: File[], delimiter: string = '|'): Promise<Blob> {
  const workbook = XLSX.utils.book_new();

  const sheetNames = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileContent = await file.text();
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== ''); // Filter out empty lines
    
    const data = lines.map(line => {
      // Handle cases where delimiter might be at the start/end or have empty segments
      const segments = line.split(delimiter);
      return segments;
    });

    let baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension for sheet name
    let potentialSheetName = sanitizeSheetName(baseName);
    let uniqueSheetName = potentialSheetName;
    let counter = 1;
    while(sheetNames.has(uniqueSheetName)) {
      uniqueSheetName = sanitizeSheetName(`${potentialSheetName.substring(0, 28 - String(counter).length)}_${counter}`); // Ensure space for _N
      counter++;
    }
    sheetNames.add(uniqueSheetName);
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, uniqueSheetName);
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
