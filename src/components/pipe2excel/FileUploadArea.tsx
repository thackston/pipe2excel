'use client';

import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { convertMultiplePipesToExcel, type ConversionResult } from '@/lib/excel-converter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileText, XCircle, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileItem } from './FileItem';

interface ProcessedFile extends ConversionResult {
  id: string;
}

// File size limits (in bytes)
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB per file
const LARGE_FILE_WARNING = 50 * 1024 * 1024; // 50MB warning threshold

export function FileUploadArea() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedExcelFile, setProcessedExcelFile] = useState<ProcessedFile | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate individual file
  const validateFile = (file: File): { isValid: boolean; warning?: string; error?: string } => {
    // Check file type
    if (!(file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe'))) {
      return { isValid: false, error: `${file.name} is not a .txt or .pipe file` };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `${file.name} is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` 
      };
    }

    // Warning for large files
    if (file.size > LARGE_FILE_WARNING) {
      return { 
        isValid: true, 
        warning: `${file.name} is large (${formatFileSize(file.size)}) and may take longer to process` 
      };
    }

    return { isValid: true };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const validFiles: File[] = [];
      let hasWarnings = false;

      filesArray.forEach(file => {
        const validation = validateFile(file);
        
        if (validation.isValid) {
          validFiles.push(file);
          if (validation.warning) {
            hasWarnings = true;
            toast({
              title: 'Large File Warning',
              description: validation.warning,
              variant: 'default',
            });
          }
        } else {
          toast({
            title: 'Invalid File',
            description: validation.error,
            variant: 'destructive',
          });
        }
      });

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        
        // Show summary toast for multiple files
        if (validFiles.length > 1) {
          const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
          toast({
            title: 'Files Added',
            description: `Added ${validFiles.length} files (Total: ${formatFileSize(totalSize)})`,
            variant: 'default',
          });
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeSelectedFile = (fileNameToRemove: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileNameToRemove));
    if (selectedFiles.length === 1 && selectedFiles[0].name === fileNameToRemove) {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProcessing) return;

    if (event.dataTransfer.files) {
      const filesArray = Array.from(event.dataTransfer.files);
      const validFiles: File[] = [];

      filesArray.forEach(file => {
        const validation = validateFile(file);
        
        if (validation.isValid) {
          validFiles.push(file);
          if (validation.warning) {
            toast({
              title: 'Large File Warning',
              description: validation.warning,
              variant: 'default',
            });
          }
        } else {
          toast({
            title: 'Invalid File',
            description: validation.error,
            variant: 'destructive',
          });
        }
      });

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
  }, [isProcessing, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const getOutputFileName = (): string => {
    if (selectedFiles.length === 0) {
      return "Output.xlsx";
    }
    if (selectedFiles.length === 1) {
      let baseName = selectedFiles[0].name.replace(/\.(txt|pipe)$/i, "");
      baseName = baseName.replace(/Audit/gi, "").trim().replace(/_+$/, "").replace(/^_+/, "");
      if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
      if (baseName.startsWith('_')) baseName = baseName.slice(1);
      return `${baseName || "Output"}.xlsx`;
    }

    // Multiple files: Check for EMR or Service
    const primaryFile = selectedFiles.find(file =>
      file.name.toLowerCase().includes("emr") || file.name.toLowerCase().includes("service")
    );

    if (primaryFile) {
      let baseName = primaryFile.name.replace(/\.(txt|pipe)$/i, "");
      baseName = baseName.replace(/Audit/gi, "").trim().replace(/_+$/, "").replace(/^_+/, "");
      if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
      if (baseName.startsWith('_')) baseName = baseName.slice(1);
      return `${baseName || "Combined_Output"}.xlsx`;
    }

    let baseName = selectedFiles[0].name.replace(/\.(txt|pipe)$/i, "");
    baseName = baseName.replace(/Audit/gi, "").trim().replace(/_+$/, "").replace(/^_+/, "");
    if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
    if (baseName.startsWith('_')) baseName = baseName.slice(1);
    return `${baseName || "Combined_Output"}.xlsx`;
  };

  // Enhanced processFiles with progress tracking and chunked processing
  const processFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select one or more files to convert.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProcessedExcelFile(null);
    setProcessingProgress('');

    try {
      // Calculate total size for progress tracking
      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      let processedSize = 0;

      setProcessingProgress('Reading files...');

      // Process files with progress updates
      const filesToConvert = await Promise.all(
        selectedFiles.map(async (file, index) => {
          setProcessingProgress(`Reading file ${index + 1}/${selectedFiles.length}: ${file.name}`);
          
          const content = await file.text();
          processedSize += file.size;
          
          // Update progress
          const progressPercent = Math.round((processedSize / totalSize) * 100);
          setProcessingProgress(`Processing files... ${progressPercent}% complete`);
          
          return { content, originalFileName: file.name };
        })
      );

      if (filesToConvert.length === 0) {
        toast({
          title: 'No valid content',
          description: 'Selected files appear to be empty or invalid.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }
      
      setProcessingProgress('Creating Excel file...');
      
      const outputFileName = getOutputFileName();
      const result = await convertMultiplePipesToExcel(filesToConvert, outputFileName);
      
      setProcessedExcelFile({ ...result, id: Date.now().toString() });
      setProcessingProgress('');
      
      toast({
        title: 'Conversion Successful',
        description: `${result.fileName} with ${filesToConvert.length} sheet(s) is ready for download.`,
      });

    } catch (error) {
      console.error('Conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: 'Conversion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadProcessedFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate total size of selected files
  const totalSelectedSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <Card className="w-full max-w-xl mx-auto mt-8 shadow-xl rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-bold tracking-tight text-center text-foreground">
          Pipe to Excel Converter
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-1">
          Upload one or more pipe-delimited .txt or .pipe files. They will be combined into a single .xlsx spreadsheet, each on its own tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer border-primary/50 hover:border-primary transition-colors bg-background hover:bg-secondary/20"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          aria-label="File upload area"
        >
          <UploadCloud className="w-12 h-12 mb-3 text-primary" />
          <p className="mb-1 text-base font-medium text-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">TXT or PIPE files (Max {formatFileSize(MAX_FILE_SIZE)} each)</p>
          <Input
            ref={fileInputRef}
            id="file-upload-input"
            type="file"
            accept=".txt,.pipe,text/plain"
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
        </div>

        {selectedFiles.length > 0 && !isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Selected files:</h4>
              <span className="text-xs text-muted-foreground">
                Total: {formatFileSize(totalSelectedSize)}
              </span>
            </div>
            
            {/* Warning for very large total size */}
            {totalSelectedSize > 100 * 1024 * 1024 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 border border-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700">
                  Large dataset detected. Processing may take several minutes.
                </span>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map(file => (
                <div key={file.name} className="flex items-center justify-between p-2 border rounded-md bg-secondary/50">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="truncate">
                      <span className="text-sm font-medium text-secondary-foreground truncate block" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSelectedFile(file.name)} aria-label={`Remove ${file.name}`}>
                    <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={processFiles}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="w-full h-12 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <LoadingSpinner /> 
                <span className="ml-2">Processing...</span>
              </div>
              {processingProgress && (
                <span className="text-xs mt-1 opacity-75">{processingProgress}</span>
              )}
            </div>
          ) : (
            `Convert ${selectedFiles.length > 0 ? selectedFiles.length : ''} file(s) to Excel`
          )}
        </Button>

        {processedExcelFile && (
          <div className="mt-8">
            <h3 className="mb-3 text-xl font-semibold text-foreground">Download Your Combined File:</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto p-1 rounded-md border bg-white/50">
              <FileItem
                key={processedExcelFile.id}
                fileName={processedExcelFile.fileName}
                onDownload={() => downloadProcessedFile(processedExcelFile.blob, processedExcelFile.fileName)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}