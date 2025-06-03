import * as XLSX from 'xlsx';

export interface ConversionResult {
  fileName: string;
  blob: Blob;
}

export function convertPipeToExcel(fileContent: string, originalFileName: string): ConversionResult {
  const lines = fileContent.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('File is empty or has no content.');
  }

  // Filter out empty lines that might result from multiple newlines
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  if (nonEmptyLines.length === 0) {
    throw new Error('File contains only whitespace or is effectively empty.');
  }

  const data = nonEmptyLines.map(line => line.split('|').map(cell => cell.trim()));

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const newFileName = originalFileName.replace(/\.(txt|pipe)$/i, "") + ".xlsx";

  return { fileName: newFileName, blob };
}
