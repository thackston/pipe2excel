import * as XLSX from 'xlsx';

export interface ConversionResult {
  fileName: string;
  blob: Blob;
}

// Chunk size for processing large files (number of rows to process at once)
const CHUNK_SIZE = 10000;

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

// Optimized function to process large text content in chunks
function processLargeContent(content: string): string[][] {
  // Split by actual newline character
  const lines = content.split('\n');
  
  // Trim each line and filter out empty ones
  const nonEmptyLines = lines
    .map(line => line.trim())
    .filter(line => line !== '');

  if (nonEmptyLines.length === 0) {
    throw new Error('File is empty or has no content after trimming.');
  }

  // For very large files, we might want to validate the first few rows
  // to ensure consistent column count
  if (nonEmptyLines.length > 1000) {
    const sampleRows = nonEmptyLines.slice(0, 10).map(line => line.split('|').length);
    const columnCount = sampleRows[0];
    const inconsistentRows = sampleRows.filter(count => count !== columnCount);
    
    if (inconsistentRows.length > 0) {
      console.warn('Detected inconsistent column counts in file. This may cause formatting issues.');
    }
  }

  // Process in chunks to avoid memory issues with very large files
  const result: string[][] = [];
  
  for (let i = 0; i < nonEmptyLines.length; i += CHUNK_SIZE) {
    const chunk = nonEmptyLines.slice(i, i + CHUNK_SIZE);
    const processedChunk = chunk.map(line => 
      line.split('|').map(cell => cell.trim())
    );
    result.push(...processedChunk);
  }

  return result;
}

export function convertPipeToExcel(fileContent: string, originalFileName: string): ConversionResult {
  const data = processLargeContent(fileContent);

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  const sheetName = getExcelSheetName(originalFileName);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true // Enable compression for smaller file sizes
  });
  
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const newFileName = originalFileName.replace(/\.(txt|pipe)$/i, "") + ".xlsx";

  return { fileName: newFileName, blob };
}

export async function convertMultiplePipesToExcel(
  filesData: Array<{ content: string; originalFileName: string }>,
  outputExcelFileName: string
): Promise<ConversionResult> {
  if (!filesData || filesData.length === 0) {
    throw new Error('No files provided for conversion.');
  }

  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  let totalRowsProcessed = 0;

  for (let fileIndex = 0; fileIndex < filesData.length; fileIndex++) {
    const file = filesData[fileIndex];
    
    try {
      console.log(`Processing file ${fileIndex + 1}/${filesData.length}: ${file.originalFileName}`);
      
      // Process large content with chunking
      const data = await processLargeContentAsync(file.content);
      
      if (data.length === 0) {
        console.warn(`File ${file.originalFileName} is empty or has no content after trimming. Skipping.`);
        continue; 
      }

      totalRowsProcessed += data.length;
      console.log(`Processed ${data.length} rows from ${file.originalFileName}. Total rows: ${totalRowsProcessed}`);

      // Create worksheet with optimizations for large datasets
      const worksheet = XLSX.utils.aoa_to_sheet(data, {
        cellStyles: false, // Disable styles for better performance
        cellFormulas: false, // We don't expect formulas in pipe-delimited data
      });
      
      // Handle sheet naming with collision detection
      let sheetName = getExcelSheetName(file.originalFileName);
      let suffix = 1;
      let finalSheetName = sheetName;
      
      while(usedSheetNames.has(finalSheetName)) {
          finalSheetName = `${sheetName.substring(0, 31 - String(suffix).length - 1)}_${suffix}`;
          suffix++;
      }
      usedSheetNames.add(finalSheetName);

      XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
      
      // Force garbage collection hint for large files
      if (totalRowsProcessed > 50000) {
        // Small delay to allow garbage collection
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
    } catch (error) {
      console.error(`Error processing file ${file.originalFileName}:`, error);
      throw new Error(`Failed to process ${file.originalFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error('No valid data found in any of the provided files to create an Excel sheet.');
  }

  console.log(`Creating Excel file with ${workbook.SheetNames.length} sheets and ${totalRowsProcessed} total rows`);

  // Write workbook with optimizations for large files
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    compression: true, // Enable compression
    cellStyles: false, // Disable styles for better performance and smaller file size
  });
  
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  console.log(`Excel file created successfully. Final size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
  
  return { fileName: outputExcelFileName, blob };
}

// Async version of processLargeContent with better memory management
async function processLargeContentAsync(content: string): Promise<string[][]> {
  // Split by actual newline character
  const lines = content.split('\n');
  
  // Trim each line and filter out empty ones
  const nonEmptyLines = lines
    .map(line => line.trim())
    .filter(line => line !== '');

  if (nonEmptyLines.length === 0) {
    throw new Error('File is empty or has no content after trimming.');
  }

  // For very large files, validate structure
  if (nonEmptyLines.length > 1000) {
    const sampleSize = Math.min(100, nonEmptyLines.length);
    const sampleRows = nonEmptyLines.slice(0, sampleSize).map(line => line.split('|').length);
    const columnCounts = [...new Set(sampleRows)];
    
    if (columnCounts.length > 1) {
      console.warn(`Detected varying column counts in file: ${columnCounts.join(', ')} columns. This may cause formatting issues.`);
    }
  }

  // Process in chunks to avoid memory issues
  const result: string[][] = [];
  
  for (let i = 0; i < nonEmptyLines.length; i += CHUNK_SIZE) {
    const chunk = nonEmptyLines.slice(i, i + CHUNK_SIZE);
    const processedChunk = chunk.map(line => 
      line.split('|').map(cell => cell.trim())
    );
    result.push(...processedChunk);
    
    // Progress logging for large files
    if (i > 0 && i % (CHUNK_SIZE * 10) === 0) {
      const progress = Math.round((i / nonEmptyLines.length) * 100);
      console.log(`Processing progress: ${progress}% (${i}/${nonEmptyLines.length} rows)`);
    }
    
    // Allow other operations to run between chunks
    if (i % (CHUNK_SIZE * 5) === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return result;
}