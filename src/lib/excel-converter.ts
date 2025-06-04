
import * as XLSX from 'xlsx';

export interface ConversionResult {
  fileName: string;
  blob: Blob;
}

function getExcelSheetName(originalFileName: string): string {
  const lowerFileName = originalFileName.toLowerCase();
  let tabName = "";

  if (lowerFileName.includes("service") || lowerFileName.includes("emr")) {
    tabName = "EMR";
  } else if (lowerFileName.includes("lab")) {
    tabName = "Lab";
  } else {
    let baseName = originalFileName.replace(/\.(txt|pipe)$/i, "");
    baseName = baseName.substring(0, 25); 
    tabName = baseName;
  }

  if (lowerFileName.includes("audit")) {
    if (tabName.length + "_Audit".length > 31) {
        tabName = tabName.substring(0, 31 - "_Audit".length);
    }
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

export function convertPipeToExcel(fileContent: string, originalFileName: string): ConversionResult {
  // Split by actual newline character
  const lines = fileContent.split('\n');
  
  // Trim each line and then filter out those that become empty
  const nonEmptyLines = lines
    .map(line => line.trim())
    .filter(line => line !== '');

  if (nonEmptyLines.length === 0) {
    throw new Error('File is empty or has no content after trimming.');
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

export function convertMultiplePipesToExcel(
  filesData: Array<{ content: string; originalFileName: string }>,
  outputExcelFileName: string
): ConversionResult {
  if (!filesData || filesData.length === 0) {
    throw new Error('No files provided for conversion.');
  }

  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  filesData.forEach((file) => {
    // Split by actual newline character
    const lines = file.content.split('\n');

    // Trim each line and then filter out those that become empty
    const nonEmptyLines = lines
      .map(line => line.trim())
      .filter(line => line !== '');

    if (nonEmptyLines.length === 0) {
      console.warn(`File ${file.originalFileName} is empty or has no content after trimming. Skipping.`);
      return; 
    }

    const data = nonEmptyLines.map(line => line.split('|').map(cell => cell.trim()));
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    let sheetName = getExcelSheetName(file.originalFileName);
    let suffix = 1;
    let finalSheetName = sheetName;
    while(usedSheetNames.has(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 31 - String(suffix).length -1 )}_${suffix}`;
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
