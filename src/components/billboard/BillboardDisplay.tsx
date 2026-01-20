import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BillboardDisplayProps {
  billboardId: string;
}

const BillboardDisplay = ({ billboardId }: BillboardDisplayProps) => {
  const { data: billboard, isLoading } = useQuery({
    queryKey: ["billboard-display", billboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("equipment_id, location_name")
        .eq("id", billboardId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!billboardId,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!billboard) {
    return <p className="text-sm text-muted-foreground">ไม่พบข้อมูลป้าย</p>;
  }

  return (
    <div className="p-3 bg-white rounded-md border border-blue-200">
      <p className="font-medium text-sm">
        {billboard.equipment_id}
        {billboard.location_name && (
          <span className="text-muted-foreground"> - {billboard.location_name}</span>
        )}
      </p>
    </div>
  );
};

export default BillboardDisplay;
