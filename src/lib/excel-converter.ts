
import * as XLSX from 'xlsx';

export interface ConversionResult {
  fileName: string;
  blob: Blob;
}

// This function remains as it's a good utility for naming individual sheets.
function getExcelSheetName(originalFileName: string): string {
  const lowerFileName = originalFileName.toLowerCase();
  let tabName = "";

  // Rule 1 & 2: Determine base tab name
  if (lowerFileName.includes("service") || lowerFileName.includes("emr")) {
    tabName = "EMR";
  } else if (lowerFileName.includes("lab")) {
    tabName = "Lab";
  } else {
    let baseName = originalFileName.replace(/\.(txt|pipe)$/i, "");
    // Leave some room for _Audit if it needs to be appended, and general limit.
    baseName = baseName.substring(0, 25); 
    tabName = baseName;
  }

  // Rule 3: Append "Audit"
  if (lowerFileName.includes("audit")) {
    // If tabName was derived from filename, ensure it doesn't exceed limits with _Audit
    if (tabName.length + "_Audit".length > 31) {
        tabName = tabName.substring(0, 31 - "_Audit".length);
    }
    // Ensure Audit is appended only once if already part of the name or base derived name
    if (!tabName.toLowerCase().endsWith("audit")){
      tabName = `${tabName}_Audit`;
    }
  }

  tabName = tabName.replace(/[\[\]\*\/\\\?\:]/g, "");
  
  if (tabName.startsWith("'")) {
    tabName = tabName.substring(1);
  }
  if (tabName.endsWith("'")) {
    tabName = tabName.slice(0, -1);
  }
  
  tabName = tabName.substring(0, 31);

  if (!tabName.trim()) {
    return "Sheet1"; 
  }

  return tabName;
}

// Original function for single file conversion (can be kept for other uses or removed if not needed)
export function convertPipeToExcel(fileContent: string, originalFileName: string): ConversionResult {
  const lines = fileContent.trim().split('\\n');
  if (lines.length === 0) {
    throw new Error('File is empty or has no content.');
  }

  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  if (nonEmptyLines.length === 0) {
    throw new Error('File contains only whitespace or is effectively empty.');
  }

  const data = nonEmptyLines.map(line => line.split('|').map(cell => cell.trim()));

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  const sheetName = getExcelSheetName(originalFileName);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const newFileName = originalFileName.replace(/\.(txt|pipe)$/i, "") + ".xlsx";

  return { fileName: newFileName, blob };
}

// New function for converting multiple files into one Excel with multiple sheets
export function convertMultiplePipesToExcel(
  filesData: Array<{ content: string; originalFileName: string }>,
  outputExcelFileName: string
): ConversionResult {
  if (!filesData || filesData.length === 0) {
    throw new Error('No files provided for conversion.');
  }

  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  filesData.forEach((file, index) => {
    const lines = file.content.trim().split('\\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length === 0) {
      // Optionally, skip this file or throw an error for this specific file
      console.warn(`File ${file.originalFileName} is empty or has no content. Skipping.`);
      return; // Skip this file
    }

    const data = nonEmptyLines.map(line => line.split('|').map(cell => cell.trim()));
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    let sheetName = getExcelSheetName(file.originalFileName);
    // Ensure unique sheet names if base names collide after sanitization
    let suffix = 1;
    let finalSheetName = sheetName;
    while(usedSheetNames.has(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 31 - String(suffix).length -1 )}_${suffix}`; // Ensure space for suffix
        suffix++;
    }
    usedSheetNames.add(finalSheetName);

    XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('No valid data found in any of the provided files to create an Excel sheet.');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  return { fileName: outputExcelFileName, blob };
}

    