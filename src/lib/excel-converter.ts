
import * as XLSX from 'xlsx';

export interface ConversionResult {
  fileName: string;
  blob: Blob;
}

function getExcelSheetName(originalFileName: string): string {
  const lowerFileName = originalFileName.toLowerCase();
  let tabName = "";

  // Rule 1 & 2: Determine base tab name
  if (lowerFileName.includes("service") || lowerFileName.includes("emr")) {
    tabName = "EMR";
  } else if (lowerFileName.includes("lab")) {
    tabName = "Lab";
  } else {
    // Default: use a sanitized version of the original filename (without extension)
    let baseName = originalFileName.replace(/\.(txt|pipe)$/i, "");
    // Leave some room for _Audit if it needs to be appended
    baseName = baseName.substring(0, 25); 
    tabName = baseName;
  }

  // Rule 3: Append "Audit"
  if (lowerFileName.includes("audit")) {
    // If tabName was derived from filename, ensure it doesn't exceed limits with _Audit
    if (tabName.length + "_Audit".length > 31) {
        tabName = tabName.substring(0, 31 - "_Audit".length);
    }
    tabName = `${tabName}_Audit`;
  }

  // Sanitize for Excel tab name constraints
  // Max length: 31 characters
  // Cannot contain: []*/\? :
  // Cannot start or end with a single quote '
  tabName = tabName.replace(/[\[\]\*\/\\\?\:]/g, ""); // Remove forbidden characters
  
  // Remove leading/trailing single quotes if they exist
  if (tabName.startsWith("'")) {
    tabName = tabName.substring(1);
  }
  if (tabName.endsWith("'")) {
    tabName = tabName.slice(0, -1);
  }
  
  // Truncate to 31 characters
  tabName = tabName.substring(0, 31);

  // Ensure tab name is not empty
  if (!tabName.trim()) {
    return "Sheet1"; // Fallback to "Sheet1" if name becomes empty after sanitization
  }

  return tabName;
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
  
  const sheetName = getExcelSheetName(originalFileName);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const newFileName = originalFileName.replace(/\.(txt|pipe)$/i, "") + ".xlsx";

  return { fileName: newFileName, blob };
}
