import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { differenceInDays, parseISO } from "date-fns";
import { Search, Monitor, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { useChartExport } from "@/hooks/useChartExport";

import { MediaPlayerRow, BillboardJourney, StockMovement } from "@/components/media-player/profile/types";
import { ProfileSearch } from "@/components/media-player/profile/ProfileSearch";
import { ProfileHeader } from "@/components/media-player/profile/ProfileHeader";
import { SummaryCards } from "@/components/media-player/profile/SummaryCards";
import { GeneralInfoTab } from "@/components/media-player/profile/GeneralInfoTab";
import { JourneyTab } from "@/components/media-player/profile/JourneyTab";
import { MovementTab } from "@/components/media-player/profile/MovementTab";

const MediaPlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);
  const { exportAsPDF } = useChartExport();

  const [player, setPlayer] = useState<MediaPlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [journeys, setJourneys] = useState<BillboardJourney[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [modelName, setModelName] = useState("-");
  const [statusLabel, setStatusLabel] = useState("Active");

  // Load player by ID
  useEffect(() => {
    if (id && id !== "search") loadPlayer(id);
    else setShowSearch(true);
  }, [id]);

  const loadPlayer = async (playerId: string) => {
    setIsLoading(true);
    setShowSearch(false);

    const { data: p } = await supabase
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
      .single();

    if (!p) {
      toast.error("ไม่พบข้อมูล Media Player");
      setIsLoading(false);
      return;
    }

    setPlayer(p as unknown as MediaPlayerRow);

    // Model name
    if ((p as any).model_id) {
      const { data: model } = await supabase
        .from("media_player_models" as any)
        .select("name")
        .eq("id", (p as any).model_id)
        .single();
      if (model) setModelName((model as any).name);
    } else {
      setModelName("-");
    }

    // Status label
    if ((p as any).status) {
      const { data: st } = await supabase
        .from("media_player_statuses" as any)
        .select("label")
        .eq("value", (p as any).status)
        .single();
      if (st) setStatusLabel((st as any).label);
      else setStatusLabel((p as any).status);
    } else {
      setStatusLabel("Active");
    }

    // Images
    const { data: imgs } = await supabase
      .from("media_player_images" as any)
      .select("image_url")
      .eq("media_player_id", playerId)
      .order("display_order");
    setImages((imgs || []).map((i: any) => i.image_url));

    // Billboard journey (history - uninstalled)
    const { data: history } = await supabase
      .from("billboard_equipment_history")
      .select("billboard_id, installation_date, uninstall_date, uninstall_reason, quantity")
      .or(`equipment_id.eq.${playerId}`);

    // Current installation from billboard_equipment
    const { data: currentInstalls } = await supabase
      .from("billboard_equipment")
      .select("billboard_id, installation_date, quantity")
      .eq("equipment_id", playerId);

    const journeyData: BillboardJourney[] = [];
    const allBbIds = new Set<string>();
    (history || []).forEach((h: any) => allBbIds.add(h.billboard_id));
    (currentInstalls || []).forEach((c: any) => allBbIds.add(c.billboard_id));

    let bbMap = new Map<string, any>();
    if (allBbIds.size > 0) {
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name")
        .in("id", [...allBbIds]);
      bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));
    }

    // Past (uninstalled) journeys
    for (const h of (history || []) as any[]) {
      const bb = bbMap.get(h.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : h.billboard_id;
      const instDate = h.installation_date;
      const uninstDate = h.uninstall_date;
      const days = instDate && uninstDate ? differenceInDays(parseISO(uninstDate), parseISO(instDate)) : null;
      journeyData.push({
        billboard_id: h.billboard_id, billboard_name: bbName, installation_date: instDate,
        uninstall_date: uninstDate, duration_days: days, uninstall_reason: h.uninstall_reason, quantity: h.quantity,
      });
    }

    // Current installation (ongoing - no uninstall date)
    for (const c of (currentInstalls || []) as any[]) {
      const bb = bbMap.get(c.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : c.billboard_id;
      const instDate = c.installation_date || (p as any).install_date;
      const days = instDate ? differenceInDays(new Date(), parseISO(instDate)) : null;
      journeyData.push({
        billboard_id: c.billboard_id, billboard_name: bbName, installation_date: instDate,
        uninstall_date: null, duration_days: days, uninstall_reason: null, quantity: c.quantity,
      });
    }

    journeyData.sort((a, b) => {
      if (!a.uninstall_date && b.uninstall_date) return -1;
      if (a.uninstall_date && !b.uninstall_date) return 1;
      return (b.installation_date || "").localeCompare(a.installation_date || "");
    });
    setJourneys(journeyData);

    // Stock movements
    const { data: movs } = await supabase
      .from("stock_movements")
      .select("id, created_at, movement_type, quantity, stock_before, stock_after, reference_document, notes, item_condition")
      .eq("equipment_code", (p as any).code)
      .order("created_at", { ascending: false })
      .limit(200);
    setMovements((movs as any) || []);

    setIsLoading(false);
  };

  // Lifecycle steps
  const lifecycleSteps: ProcessStep[] = useMemo(() => {
    if (!player) return [];
    const hasReceipt = !!player.date_of_receipt;
    const hasLocation = !!player.location_id;
    const isInstalled = !!player.billboard_id;
    const hasHistory = journeys.length > 0;

    // Infer earlier steps as done if later steps are completed
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-8 h-8" />
            Media Player Profile
          </h1>
          <p className="text-muted-foreground">ค้นหาด้วย S/N, รหัส, หรือชื่อ แล้วดูข้อมูลครบจบในหน้าเดียว</p>
        </div>
        <div className="flex gap-2">
          {player && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAsPDF(profileRef.current, `media-player-profile-${player.code}`)}
              >
                <FileDown className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => { setPlayer(null); setShowSearch(true); navigate("/media-player/search", { replace: true }); }}>
                <Search className="w-4 h-4 mr-2" />
                ค้นหาใหม่
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      {(showSearch || !player) && <ProfileSearch />}

      {/* Player Profile */}
      {player && (
        <div ref={profileRef} className="space-y-6">
          <ProfileHeader player={player} modelName={modelName} statusLabel={statusLabel} images={images} />
          <SummaryCards player={player} journeys={journeys} />

          {/* Process Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessTracker steps={lifecycleSteps} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
              <TabsTrigger value="journey">ประวัติติดตั้ง</TabsTrigger>
              <TabsTrigger value="movements">Stock Card</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralInfoTab player={player} modelName={modelName} />
            </TabsContent>

            <TabsContent value="journey">
              <JourneyTab player={player} journeys={journeys} />
            </TabsContent>

            <TabsContent value="movements">
              <MovementTab movements={movements} playerCode={player.code} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default MediaPlayerProfile;
