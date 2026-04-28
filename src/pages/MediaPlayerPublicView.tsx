import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { differenceInDays, parseISO } from "date-fns";
import { Loader2, Monitor } from "lucide-react";
import { toast } from "sonner";
import { formatBillboardLabel } from "@/lib/billboardUtils";

import { MediaPlayerRow, BillboardJourney } from "@/components/media-player/profile/types";
import { ProfileHeader } from "@/components/media-player/profile/ProfileHeader";
import { SummaryCards } from "@/components/media-player/profile/SummaryCards";
import { GeneralInfoTab } from "@/components/media-player/profile/GeneralInfoTab";
import { JourneyTab } from "@/components/media-player/profile/JourneyTab";

/**
 * Public read-only Media Player profile.
 * Accessible without authentication (uses anon RLS).
 * Used by QR code scanning so mobile users don't have to log in.
 */
const MediaPlayerPublicView = () => {
  const { id } = useParams<{ id: string }>();

  const [player, setPlayer] = useState<MediaPlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journeys, setJourneys] = useState<BillboardJourney[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [modelName, setModelName] = useState("-");
  const [statusLabel, setStatusLabel] = useState("Active");

  useEffect(() => {
    if (id) loadPlayer(id);
  }, [id]);

  const loadPlayer = async (playerId: string) => {
    setIsLoading(true);

    const { data: p, error } = await supabase
      .from("media_players")
      .select(`
        *,
        billboard:billboards(id, equipment_id, old_code, location_name),
        companies(name),
        cms_types(name),
        locations(name),
        suppliers(name)
      `)
      .eq("id", playerId)
      .maybeSingle();

    if (error || !p) {
      toast.error("ไม่พบข้อมูล Media Player");
      setIsLoading(false);
      return;
    }

    setPlayer(p as unknown as MediaPlayerRow);

    if ((p as any).model_id) {
      const { data: model } = await supabase
        .from("media_player_models" as any)
        .select("name")
        .eq("id", (p as any).model_id)
        .maybeSingle();
      if (model) setModelName((model as any).name);
    }

    if ((p as any).status) {
      const { data: st } = await supabase
        .from("media_player_statuses" as any)
        .select("label")
        .eq("value", (p as any).status)
        .maybeSingle();
      setStatusLabel(st ? (st as any).label : (p as any).status);
    }

    const { data: imgs } = await supabase
      .from("media_player_images" as any)
      .select("image_url")
      .eq("media_player_id", playerId)
      .order("display_order");
    setImages((imgs || []).map((i: any) => i.image_url));

    // Journeys
    const { data: history } = await supabase
      .from("billboard_equipment_history")
      .select("billboard_id, installation_date, uninstall_date, uninstall_reason, quantity")
      .eq("equipment_id", playerId);

    const { data: currentInstalls } = await supabase
      .from("billboard_equipment")
      .select("billboard_id, installation_date, quantity")
      .eq("equipment_id", playerId);

    const journeyData: BillboardJourney[] = [];
    const allBbIds = new Set<string>();
    (history || []).forEach((h: any) => allBbIds.add(h.billboard_id));
    (currentInstalls || []).forEach((c: any) => allBbIds.add(c.billboard_id));
    if ((p as any).billboard_id) allBbIds.add((p as any).billboard_id);

    let bbMap = new Map<string, any>();
    if (allBbIds.size > 0) {
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name")
        .in("id", [...allBbIds]);
      bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));
    }

    for (const h of (history || []) as any[]) {
      const bb = bbMap.get(h.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : h.billboard_id;
      const days = h.installation_date && h.uninstall_date
        ? differenceInDays(parseISO(h.uninstall_date), parseISO(h.installation_date))
        : null;
      journeyData.push({
        billboard_id: h.billboard_id,
        billboard_name: bbName,
        installation_date: h.installation_date,
        uninstall_date: h.uninstall_date,
        duration_days: days,
        uninstall_reason: h.uninstall_reason,
        quantity: h.quantity,
      });
    }

    for (const c of (currentInstalls || []) as any[]) {
      const bb = bbMap.get(c.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : c.billboard_id;
      const instDate = c.installation_date || (p as any).install_date;
      journeyData.push({
        billboard_id: c.billboard_id,
        billboard_name: bbName,
        installation_date: instDate,
        uninstall_date: null,
        duration_days: instDate ? differenceInDays(new Date(), parseISO(instDate)) : null,
        uninstall_reason: null,
        quantity: c.quantity,
      });
    }

    journeyData.sort((a, b) => {
      if (!a.uninstall_date && b.uninstall_date) return -1;
      if (a.uninstall_date && !b.uninstall_date) return 1;
      return (b.installation_date || "").localeCompare(a.installation_date || "");
    });
    setJourneys(journeyData);

    setIsLoading(false);
  };

  const lifecycleSteps: ProcessStep[] = useMemo(() => {
    if (!player) return [];
    const hasReceipt = !!player.date_of_receipt;
    const hasLocation = !!player.location_id;
    const isInstalled = !!player.billboard_id;
    const hasHistory = journeys.length > 0;
    const receiptDone = hasReceipt || hasLocation || isInstalled || hasHistory;
    const storageDone = hasLocation || isInstalled || hasHistory;
    return [
      { label: "ลงทะเบียน", status: "done", date: player.created_at },
      { label: "รับเข้าคลัง", status: receiptDone ? "done" : "pending", date: player.date_of_receipt },
      { label: "จัดเก็บ", status: storageDone ? "done" : (hasReceipt ? "current" : "pending") },
      { label: "ติดตั้งป้าย", status: isInstalled ? "done" : (hasHistory ? "done" : (storageDone ? "current" : "pending")), date: player.install_date },
      ...(hasHistory && !isInstalled ? [{ label: "ถอด/คืนคลัง", status: "done" as const }] : []),
    ];
  }, [player, journeys]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2">
        <Monitor className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">ไม่พบข้อมูล Media Player นี้</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-4 px-3 md:py-8 md:px-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {/* Public banner */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="w-4 h-4" />
          <span>ข้อมูล Media Player (มุมมองสาธารณะ)</span>
        </div>

        <ProfileHeader player={player} modelName={modelName} statusLabel={statusLabel} images={images} />
        <SummaryCards player={player} journeys={journeys} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessTracker steps={lifecycleSteps} />
          </CardContent>
        </Card>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
            <TabsTrigger value="journey">ประวัติติดตั้ง</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralInfoTab player={player} modelName={modelName} />
          </TabsContent>

          <TabsContent value="journey">
            <JourneyTab player={player} journeys={journeys} />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Powered by EquipMind
        </p>
      </div>
    </div>
  );
};

export default MediaPlayerPublicView;
