import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer } from "lucide-react";

export default function QRCodePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type || !id) {
      toast.error("ข้อมูลไม่ถูกต้อง");
      navigate("/master-data");
      return;
    }
    
    fetchData();
  }, [type, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let query;
      switch (type) {
        case "location":
          query = supabase.from("locations").select("*").eq("id", id).single();
          break;
        default:
          throw new Error("ประเภทข้อมูลไม่ถูกต้อง");
      }

      const { data: result, error } = await query;
      
      if (error) throw error;
      setData(result);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
      navigate("/master-data");
    } finally {
      setLoading(false);
    }
  };

  const getQRValue = () => {
    if (!data) return "";
    
    return JSON.stringify({
      type,
      id,
      timestamp: new Date().toISOString(),
    });
  };

  const getDisplayInfo = () => {
    if (!data) return { title: "", description: "" };
    
    switch (type) {
      case "location":
        return {
          title: `ตำแหน่ง: ${data.name}`,
          description: `รหัส: ${data.code}`,
        };
      default:
        return { title: "", description: "" };
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
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
      downloadLink.download = `qr-code-${type}-${id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  const { title, description } = getDisplayInfo();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/master-data")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับ
        </Button>

        <h1 className="text-3xl font-bold">QR Code สำหรับสแกน</h1>
        <p className="text-muted-foreground mt-2">
          สแกน QR Code นี้เพื่อดูข้อมูลตำแหน่งจัดเก็บ
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="bg-white p-8 rounded-lg">
              <QRCode
                id="qr-code"
                value={getQRValue()}
                size={256}
                level="H"
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                ดาวน์โหลด
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์
              </Button>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              <p>QR Code นี้มีข้อมูลสำหรับระบุตำแหน่งจัดเก็บ</p>
              <p className="mt-1">สแกนด้วยแอปพลิเคชันที่รองรับเพื่อดูรายละเอียด</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-code, #qr-code * {
            visibility: visible;
          }
          #qr-code {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
