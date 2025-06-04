
'use client';

import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { convertMultiplePipesToExcel, type ConversionResult } from '@/lib/excel-converter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileText, XCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileItem } from './FileItem';

interface ProcessedFile extends ConversionResult {
  id: string;
}

export function FileUploadArea() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedExcelFile, setProcessedExcelFile] = useState<ProcessedFile | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const validFiles = filesArray.filter(file => {
        if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe')) {
          return true;
        } else {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not a .txt or .pipe file and was ignored.`,
            variant: 'destructive',
          });
          return false;
        }
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
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
      const validFiles = filesArray.filter(file => {
        if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe')) {
          return true;
        } else {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not a .txt or .pipe file and was ignored.`,
            variant: 'destructive',
          });
          return false;
        }
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [isProcessing, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const getOutputFileName = (): string => {
    if (selectedFiles.length === 0) {
      return "Output.xlsx"; // Should not happen if button is disabled
    }
    if (selectedFiles.length === 1) {
      let baseName = selectedFiles[0].name.replace(/\.(txt|pipe)$/i, "");
      baseName = baseName.replace(/Audit/gi, "").trim().replace(/_+$/, "").replace(/^_+/, "");
      if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
      if (baseName.startsWith('_')) baseName = baseName.slice(1);
      return `${baseName || "Output"}.xlsx`; // Fallback if name becomes empty
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
      return `${baseName || "Combined_Output"}.xlsx`; // Fallback if name becomes empty
    }

    // Fallback for multiple files if no EMR/Service: Use the first selected file.
    let baseName = selectedFiles[0].name.replace(/\.(txt|pipe)$/i, "");
    baseName = baseName.replace(/Audit/gi, "").trim().replace(/_+$/, "").replace(/^_+/, "");
    if (baseName.endsWith('_')) baseName = baseName.slice(0, -1);
    if (baseName.startsWith('_')) baseName = baseName.slice(1);
    return `${baseName || "Combined_Output"}.xlsx`; // Fallback if name becomes empty
  };


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

    try {
      const filesToConvert = await Promise.all(
        selectedFiles.map(async file => {
          const content = await file.text();
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
      
      const outputFileName = getOutputFileName();
      const result = convertMultiplePipesToExcel(filesToConvert, outputFileName);
      
      setProcessedExcelFile({ ...result, id: Date.now().toString() });
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
          <p className="text-xs text-muted-foreground">TXT or PIPE files (Max 5MB each)</p>
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
            <h4 className="text-sm font-medium text-foreground">Selected files:</h4>
            {selectedFiles.map(file => (
              <div key={file.name} className="flex items-center justify-between p-2 border rounded-md bg-secondary/50">
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-secondary-foreground truncate" title={file.name}>{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeSelectedFile(file.name)} aria-label={`Remove ${file.name}`}>
                  <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={processFiles}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="w-full h-12 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner /> <span className="ml-2">Processing...</span>
            </>
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
    
