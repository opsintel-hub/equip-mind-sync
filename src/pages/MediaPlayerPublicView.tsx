import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { differenceInDays, parseISO } from "date-fns";
import { Loader2, Monitor } from "lucide-react";
import { toast } from "sonner";
import { formatBillboardLabel } from "@/lib/billboardUtils";

import { MediaPlayerRow, BillboardJourney, StockMovement } from "@/components/media-player/profile/types";
import { ProfileHeader } from "@/components/media-player/profile/ProfileHeader";
import { SummaryCards } from "@/components/media-player/profile/SummaryCards";
import { GeneralInfoTab } from "@/components/media-player/profile/GeneralInfoTab";
import { JourneyTab } from "@/components/media-player/profile/JourneyTab";
import { MovementTab } from "@/components/media-player/profile/MovementTab";

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
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [modelName, setModelName] = useState("-");
  const [statusLabel, setStatusLabel] = useState("Active");

  useEffect(() => {
    if (id) loadPlayer(id);
  }, [id]);

  const loadPlayer = async (playerId: string) => {
    setIsLoading(true);

    const { data: pRaw, error } = await supabase.rpc(
      "public_get_media_player_profile" as any,
      { _id: playerId }
    );
    const p: any = pRaw;

    if (error || !p) {
      toast.error("ไม่พบข้อมูล Media Player");
      setIsLoading(false);
      return;
    }

    // Fetch supplier name via safe RPC (anon SELECT on suppliers is restricted)
    if ((p as any).supplier_id) {
      const { data: supplierName } = await supabase.rpc(
        "public_get_supplier_name" as any,
        { _id: (p as any).supplier_id }
      );
      if (supplierName) (p as any).suppliers = { name: supplierName };
    }

    setPlayer(p as unknown as MediaPlayerRow);

    const [modelRes, statusRes, imgRes] = await Promise.all([
      (p as any).model_id
        ? supabase.from("media_player_models" as any).select("name").eq("id", (p as any).model_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      (p as any).status
        ? supabase.from("media_player_statuses" as any).select("label").eq("value", (p as any).status).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("media_player_images" as any).select("image_url").eq("media_player_id", playerId).order("display_order"),
    ]);
    if (modelRes.data) setModelName((modelRes.data as any).name);
    setStatusLabel(statusRes.data ? (statusRes.data as any).label : ((p as any).status || "Active"));
    setImages(((imgRes.data as any) || []).map((i: any) => i.image_url));

    // Journeys
    const [{ data: history }, { data: currentInstalls }, { data: movs }] = await Promise.all([
      supabase.rpc("public_get_mp_billboard_history" as any, { _media_player_id: playerId }),
      supabase
        .from("billboard_equipment")
        .select("billboard_id, installation_date, quantity")
        .eq("equipment_id", playerId),
      supabase.rpc("public_get_mp_stock_movements" as any, { _media_player_id: playerId }),
    ]);
    setMovements((movs as any) || []);

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
          <span>{((player as any).device_type || '').toString().toUpperCase() === 'MONITOR' ? 'ข้อมูลจอภาพ (มุมมองสาธารณะ)' : 'ข้อมูล Media Player (มุมมองสาธารณะ)'}</span>
        </div>

        <ProfileHeader player={player} modelName={modelName} statusLabel={statusLabel} images={images} />

        {/* Quick jump links — shown clearly on mobile */}
        <div className="flex flex-wrap gap-2">
          <a href="#general" className="px-3 py-1.5 rounded-md border bg-background text-xs font-medium hover:bg-muted">ข้อมูลทั่วไป</a>
          <a href="#journey" className="px-3 py-1.5 rounded-md border bg-background text-xs font-medium hover:bg-muted">ประวัติติดตั้ง</a>
          <a href="#movements" className="px-3 py-1.5 rounded-md border bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">📊 Stock Card</a>
        </div>

        <section id="general" className="scroll-mt-4">
          <GeneralInfoTab player={player} modelName={modelName} />
        </section>

        <section id="journey" className="scroll-mt-4">
          <JourneyTab player={player} journeys={journeys} />
        </section>

        <section id="movements" className="scroll-mt-4">
          <MovementTab movements={movements} playerCode={player.code} />
        </section>

        <SummaryCards player={player} journeys={journeys} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessTracker steps={lifecycleSteps} />
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Powered by EquipMind
        </p>
      </div>
    </div>
  );
};

export default MediaPlayerPublicView;
