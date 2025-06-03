
"use client";

import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploadAreaProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFilesAdded, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const textFiles = newFiles.filter(file => file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe') || file.name.endsWith('.psv'));
      if (textFiles.length < newFiles.length) {
        toast({
          title: "File type warning",
          description: "Some non-text files were ignored. Please upload pipe-delimited text files.",
          variant: "default", // or "destructive" if it's a harder error
        });
      }
      if (textFiles.length > 0) {
        onFilesAdded(textFiles);
      }
      // Reset input value to allow re-uploading the same file
      if(inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled && !isDragging) setIsDragging(true); // Ensure dragging state is set if somehow missed
  }, [disabled, isDragging]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles = Array.from(event.dataTransfer.files);
      const textFiles = newFiles.filter(file => file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.pipe') || file.name.endsWith('.psv'));
       if (textFiles.length < newFiles.length) {
        toast({
          title: "File type warning",
          description: "Some non-text files were ignored. Please upload pipe-delimited text files.",
          variant: "default",
        });
      }
      if (textFiles.length > 0) {
         onFilesAdded(textFiles);
      }
      event.dataTransfer.clearData();
    }
  }, [disabled, onFilesAdded, toast]);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        'border-border hover:border-primary',
        isDragging && 'border-primary bg-primary/10',
        disabled && 'cursor-not-allowed opacity-50 bg-muted/50'
      )}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.pipe,.psv,text/plain"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <UploadCloud className={cn('w-12 h-12 mb-4', isDragging ? 'text-primary' : 'text-muted-foreground')} />
      <p className="text-lg font-semibold text-foreground">
        Drag & drop your files here
      </p>
      <p className="text-sm text-muted-foreground">or click to select files</p>
      <p className="text-xs text-muted-foreground mt-2">(.txt, .pipe, .psv files)</p>
    </div>
  );
};

export default FileUploadArea;
