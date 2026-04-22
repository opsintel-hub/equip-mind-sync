-- 1. Remove anon read access from suppliers table
DROP POLICY IF EXISTS "Allow anon read suppliers for public view" ON public.suppliers;

-- 2. Fix goods_receipt_pending: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can create pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Authenticated users can create pending receipts"
  ON public.goods_receipt_pending FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Authenticated users can view pending receipts"
  ON public.goods_receipt_pending FOR SELECT
  TO authenticated
  USING (true);