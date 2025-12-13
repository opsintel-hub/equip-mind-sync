import { useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Printer } from "lucide-react";

interface BillboardQRCodeProps {
  billboardId: string;
  billboardCode: string;
  locationName?: string;
}

const BillboardQRCode = ({ billboardId, billboardCode, locationName }: BillboardQRCodeProps) => {
  const [open, setOpen] = useState(false);

  // Generate public URL for the billboard
  const getQRValue = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/billboard-view/${billboardId}`;
  };

  const handleDownload = () => {
    const svg = document.getElementById("billboard-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-billboard-${billboardCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = document.getElementById("billboard-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${billboardCode}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .code {
              font-size: 24px;
              font-weight: bold;
              margin-top: 20px;
            }
            .location {
              font-size: 14px;
              color: #666;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${svgData}
            <div class="code">${billboardCode}</div>
            ${locationName ? `<div class="location">${locationName}</div>` : ""}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code ป้ายโฆษณา</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <QRCode
              id="billboard-qr-code"
              value={getQRValue()}
              size={200}
              level="H"
            />
          </div>
          
          <div className="text-center">
            <p className="font-semibold text-lg">{billboardCode}</p>
            {locationName && (
              <p className="text-sm text-muted-foreground">{locationName}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            สแกน QR Code นี้เพื่อดูข้อมูลป้ายและอุปกรณ์ที่ติดตั้ง
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillboardQRCode;
