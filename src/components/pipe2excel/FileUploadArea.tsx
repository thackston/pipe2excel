'use client';

import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { convertPipeToExcel, type ConversionResult } from '@/lib/excel-converter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileText } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileItem } from './FileItem';

interface ProcessedFile extends ConversionResult {
  id: string;
}

export function FileUploadArea() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe')) {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a .txt or .pipe file.',
          variant: 'destructive',
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input
        }
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProcessing) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe')) {
        setSelectedFile(file);
         if (fileInputRef.current) {
          // Simulate file selection for the input if needed, or just use the dropped file state
           const dataTransfer = new DataTransfer();
           dataTransfer.items.add(file);
           fileInputRef.current.files = dataTransfer.files;
        }
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a .txt or .pipe file.',
          variant: 'destructive',
        });
      }
    }
  }, [isProcessing, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const processFile = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to convert.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const fileContent = await selectedFile.text();
      const result = convertPipeToExcel(fileContent, selectedFile.name);
      
      setProcessedFiles(prev => [{ ...result, id: Date.now().toString() }, ...prev].slice(0, 5)); // Keep last 5
      toast({
        title: 'Conversion Successful',
        description: `${result.fileName} is ready for download.`,
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
      setSelectedFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
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
          Upload your pipe-delimited .txt or .pipe file to convert it into an .xlsx spreadsheet.
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
        >
          <UploadCloud className="w-12 h-12 mb-3 text-primary" />
          <p className="mb-1 text-base font-medium text-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">TXT or PIPE files (Max 5MB)</p>
          <Input
            ref={fileInputRef}
            id="file-upload-input"
            type="file"
            accept=".txt,.pipe,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {selectedFile && !isProcessing && (
          <div className="p-3 border rounded-md bg-secondary/50">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">{selectedFile.name}</span>
            </div>
          </div>
        )}

        <Button
          onClick={processFile}
          disabled={!selectedFile || isProcessing}
          className="w-full h-12 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow"
          size="lg"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner /> <span className="ml-2">Processing...</span>
            </>
          ) : (
            'Convert to Excel'
          )}
        </Button>

        {processedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-xl font-semibold text-foreground">Download Files:</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto p-1 rounded-md border bg-white/50">
              {processedFiles.map((file) => (
                <FileItem
                  key={file.id}
                  fileName={file.fileName}
                  onDownload={() => downloadProcessedFile(file.blob, file.fileName)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
