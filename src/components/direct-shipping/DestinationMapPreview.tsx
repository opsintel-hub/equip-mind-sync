import { MapPin } from "lucide-react";

interface DestinationMapPreviewProps {
  lat: number;
  lng: number;
  className?: string;
}

export function DestinationMapPreview({ lat, lng, className = "" }: DestinationMapPreviewProps) {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>พิกัด: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
      </div>
      <div className="rounded-lg overflow-hidden border border-border">
        <iframe
          src={mapUrl}
          width="100%"
          height="250"
          style={{ border: 0 }}
          loading="lazy"
          title="Destination Map"
        />
      </div>
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        เปิดแผนที่ขนาดเต็ม →
      </a>
    </div>
  );
}
