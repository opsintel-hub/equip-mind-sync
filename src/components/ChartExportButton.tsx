import { Download, FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChartExport } from '@/hooks/useChartExport';
import { RefObject } from 'react';

interface ChartExportButtonProps {
  chartRef: RefObject<HTMLDivElement>;
  filename: string;
}

export const ChartExportButton = ({ chartRef, filename }: ChartExportButtonProps) => {
  const { exportAsImage, exportAsPDF } = useChartExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportAsImage(chartRef.current, filename)}>
          <FileImage className="h-4 w-4 mr-2" />
          Export เป็นรูปภาพ (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsPDF(chartRef.current, filename)}>
          <FileText className="h-4 w-4 mr-2" />
          Export เป็น PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
