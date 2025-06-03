
"use client";

import React from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileItemProps {
  file: File;
  onRemove: (fileName: string) => void;
  disabled?: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, disabled }) => {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 my-1 rounded-md border bg-card',
      disabled && 'opacity-70'
      )}>
      <div className="flex items-center space-x-3 overflow-hidden">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <span className="text-sm text-card-foreground truncate" title={file.name}>
          {file.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          ({(file.size / 1024).toFixed(1)} KB)
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(file.name)}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
        className="h-7 w-7 shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default FileItem;
