import type React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileItemProps {
  fileName: string;
  onDownload: () => void;
}

export function FileItem({ fileName, onDownload }: FileItemProps) {
  return (
    <div className="flex items-center justify-between p-3 my-1 border rounded-md shadow-sm bg-card hover:bg-secondary/30 transition-colors">
      <span className="text-sm text-card-foreground truncate pr-2" title={fileName}>{fileName}</span>
      <Button onClick={onDownload} variant="outline" size="sm">
        <Download className="mr-1.5 h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
