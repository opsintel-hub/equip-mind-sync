import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export const useChartExport = () => {
  const exportAsImage = useCallback(async (elementRef: HTMLElement | null, filename: string) => {
    if (!elementRef) {
      toast.error('ไม่พบกราฟที่ต้องการ Export');
      return;
    }

    try {
      const canvas = await html2canvas(elementRef, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Export รูปภาพสำเร็จ');
    } catch (error) {
      console.error('Export image error:', error);
      toast.error('เกิดข้อผิดพลาดในการ Export รูปภาพ');
    }
  }, []);

  const exportAsPDF = useCallback(async (elementRef: HTMLElement | null, filename: string) => {
    if (!elementRef) {
      toast.error('ไม่พบกราฟที่ต้องการ Export');
      return;
    }

    try {
      const canvas = await html2canvas(elementRef, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
      
      toast.success('Export PDF สำเร็จ');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('เกิดข้อผิดพลาดในการ Export PDF');
    }
  }, []);

  return { exportAsImage, exportAsPDF };
};
