
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FileUploadArea from '@/components/pipe2excel/FileUploadArea';
import FileItem from '@/components/pipe2excel/FileItem';
import LoadingSpinner from '@/components/pipe2excel/LoadingSpinner';
import { convertPipeDelimitedToExcel } from '@/lib/excel-converter';
import { Download, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Pipe2ExcelPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Clean up object URL when component unmounts or downloadUrl changes
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setError(null); // Clear previous errors
    setDownloadUrl(null); // Clear previous download link
    setSelectedFiles(prevFiles => {
      const combinedFiles = [...prevFiles];
      newFiles.forEach(newFile => {
        if (!prevFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)) {
          combinedFiles.push(newFile);
        } else {
           toast({
            title: "Duplicate File",
            description: `File "${newFile.name}" is already in the list.`,
          });
        }
      });
      return combinedFiles;
    });
  }, [toast]);

  const handleRemoveFile = useCallback((fileName: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    setDownloadUrl(null); // Clear download link if files change
  }, []);

  const handleConvert = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to convert.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const blob = await convertPipeDelimitedToExcel(selectedFiles);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      toast({
        title: "Success!",
        description: "Your Excel file is ready for download.",
      });
    } catch (err) {
      console.error("Conversion error:", err);
      let message = "An unknown error occurred during conversion.";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(`Conversion failed: ${message}`);
      toast({
        title: "Conversion Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <FileSpreadsheet className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Pipe2Excel</CardTitle>
          <CardDescription className="text-md">
            Convert your pipe-delimited text files into Excel spreadsheets with ease.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadArea onFilesAdded={handleFilesAdded} disabled={isProcessing} />
          
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <h3 className="text-sm font-medium text-foreground">Selected Files:</h3>
              {selectedFiles.map(file => (
                <FileItem
                  key={file.name + file.lastModified}
                  file={file}
                  onRemove={handleRemoveFile}
                  disabled={isProcessing}
                />
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
          {isProcessing ? (
            <LoadingSpinner text="Converting files..." className="my-4" />
          ) : (
            <>
              <Button
                onClick={handleConvert}
                disabled={selectedFiles.length === 0 || isProcessing}
                className="w-full sm:w-auto"
                size="lg"
              >
                Convert to Excel
              </Button>
              {downloadUrl && (
                <Button
                  asChild
                  variant="accent"
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                >
                  <a href={downloadUrl} download="Pipe2Excel_Output.xlsx">
                    <Download className="mr-2 h-5 w-5" />
                    Download Excel File
                  </a>
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Pipe2Excel. All rights reserved.</p>
      </footer>
    </main>
  );
}
