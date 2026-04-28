CREATE POLICY "Public can view media_players for QR profile" ON public.media_players FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view billboards for QR profile" ON public.billboards FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view locations for QR profile" ON public.locations FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view companies for QR profile" ON public.companies FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view suppliers for QR profile" ON public.suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view cms_types for QR profile" ON public.cms_types FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view media_player_models for QR profile" ON public.media_player_models FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view media_player_statuses for QR profile" ON public.media_player_statuses FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view media_player_images for QR profile" ON public.media_player_images FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view billboard_equipment for QR profile" ON public.billboard_equipment FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view billboard_equipment_history for QR profile" ON public.billboard_equipment_history FOR SELECT TO anon USING (true);

UPDATE public.media_players mp
SET 
  supplier_id = COALESCE(mp.supplier_id, grp.supplier_id),
  company_id = COALESCE(mp.company_id, grp.company_id),
  unit_price = CASE WHEN COALESCE(mp.unit_price, 0) = 0 THEN COALESCE(grp.unit_price, mp.unit_price) ELSE mp.unit_price END,
  date_of_receipt = COALESCE(mp.date_of_receipt, grp.received_at::date),
  po_number = COALESCE(NULLIF(mp.po_number, ''), grp.po_number),
  invoice_number = COALESCE(NULLIF(mp.invoice_number, ''), grp.invoice_number),
  pr_number = COALESCE(NULLIF(mp.pr_number, ''), grp.pr_number),
  depreciation_months = COALESCE(mp.depreciation_months, grp.depreciation_months),
  warranty_expiry_date = COALESCE(mp.warranty_expiry_date, grp.warranty_expiry_date),
  po_document_url = COALESCE(mp.po_document_url, grp.purchase_document_url),
  invoice_document_url = COALESCE(mp.invoice_document_url, grp.invoice_document_url),
  delivery_note_number = COALESCE(NULLIF(mp.delivery_note_number, ''), grp.delivery_note_number),
  delivery_note_document_url = COALESCE(mp.delivery_note_document_url, grp.delivery_note_document_url),
  order_for_project = COALESCE(NULLIF(mp.order_for_project, ''), grp.order_for_project),
  activate_windows = COALESCE(NULLIF(mp.activate_windows, ''), grp.activate_windows),
  updated_at = now()
FROM (
  SELECT DISTINCT ON (equipment_code) 
    equipment_code, supplier_id, company_id, unit_price, received_at,
    po_number, invoice_number, pr_number, depreciation_months, warranty_expiry_date,
    purchase_document_url, invoice_document_url,
    delivery_note_number, delivery_note_document_url,
    order_for_project, activate_windows
  FROM public.goods_receipt_pending
  WHERE status = 'received'
  ORDER BY equipment_code, received_at DESC
) grp
WHERE mp.code = grp.equipment_code;