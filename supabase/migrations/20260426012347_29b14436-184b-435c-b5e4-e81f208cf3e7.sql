-- billboard_equipment: ตารางเชื่อม ใช้ join บ่อยสุด
CREATE INDEX IF NOT EXISTS idx_billboard_equipment_billboard_id ON public.billboard_equipment(billboard_id);
CREATE INDEX IF NOT EXISTS idx_billboard_equipment_equipment_id ON public.billboard_equipment(equipment_id);

-- billboards
CREATE INDEX IF NOT EXISTS idx_billboards_status ON public.billboards(status);
CREATE INDEX IF NOT EXISTS idx_billboards_created_at ON public.billboards(created_at DESC);

-- equipment
CREATE INDEX IF NOT EXISTS idx_equipment_location_id ON public.equipment(location_id);
CREATE INDEX IF NOT EXISTS idx_equipment_subcategory_id ON public.equipment(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_equipment_supplier_id ON public.equipment(supplier_id);
CREATE INDEX IF NOT EXISTS idx_equipment_created_at ON public.equipment(created_at DESC);

-- media_players
CREATE INDEX IF NOT EXISTS idx_media_players_billboard_id ON public.media_players(billboard_id);
CREATE INDEX IF NOT EXISTS idx_media_players_location_id ON public.media_players(location_id);
CREATE INDEX IF NOT EXISTS idx_media_players_status ON public.media_players(status);
CREATE INDEX IF NOT EXISTS idx_media_players_model_id ON public.media_players(model_id);
CREATE INDEX IF NOT EXISTS idx_media_players_company_id ON public.media_players(company_id);
CREATE INDEX IF NOT EXISTS idx_media_players_created_at ON public.media_players(created_at DESC);

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON public.locations(warehouse_id);

-- goods_issue_pending
CREATE INDEX IF NOT EXISTS idx_goods_issue_pending_status ON public.goods_issue_pending(status);
CREATE INDEX IF NOT EXISTS idx_goods_issue_pending_created_at ON public.goods_issue_pending(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_issue_pending_billboard_id ON public.goods_issue_pending(billboard_id);
CREATE INDEX IF NOT EXISTS idx_goods_issue_pending_equipment_id ON public.goods_issue_pending(equipment_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON public.notifications(reference_id) WHERE reference_id IS NOT NULL;

-- update statistics
ANALYZE public.billboard_equipment;
ANALYZE public.billboards;
ANALYZE public.equipment;
ANALYZE public.media_players;
ANALYZE public.locations;
ANALYZE public.goods_issue_pending;
ANALYZE public.notifications;