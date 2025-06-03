
'use client';

import { FileUploadArea } from '@/components/pipe2excel/FileUploadArea';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 bg-gradient-to-br from-background via-secondary/10 to-background selection:bg-primary/20">
      <div className="container mx-auto w-full py-8">
        <FileUploadArea />
      </div>
       <footer className="py-8 mt-auto text-center text-xs text-muted-foreground">
        {currentYear ? `Pipe2Excel Converter © ${currentYear}. Built with Next.js & ShadCN UI.` : 'Loading year...'}
      </footer>
    </main>
  );
}
