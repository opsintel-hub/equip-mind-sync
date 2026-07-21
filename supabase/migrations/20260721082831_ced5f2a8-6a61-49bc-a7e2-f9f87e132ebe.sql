
-- 1. Extend tools table
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_required boolean NOT NULL DEFAULT true;

-- Personal tools default to return_required=false
UPDATE public.tools SET return_required = false WHERE is_personal_tool = true;

-- 2. Extend equipment_loans for tools
ALTER TABLE public.equipment_loans
  ADD COLUMN IF NOT EXISTS tool_id uuid REFERENCES public.tools(id),
  ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'equipment' CHECK (item_kind IN ('equipment','tool')),
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS pm_task_id uuid,
  ADD COLUMN IF NOT EXISTS holder_user_id uuid,
  ADD COLUMN IF NOT EXISTS holder_name text,
  ADD COLUMN IF NOT EXISTS return_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS issued_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS issued_by uuid;

-- Relax company constraint for tool loans (same company allowed)
ALTER TABLE public.equipment_loans DROP CONSTRAINT IF EXISTS check_different_companies;
ALTER TABLE public.equipment_loans
  ADD CONSTRAINT check_different_companies
  CHECK (item_kind = 'tool' OR from_company_id <> to_company_id);

-- Make company columns nullable for tool loans
ALTER TABLE public.equipment_loans ALTER COLUMN from_company_id DROP NOT NULL;
ALTER TABLE public.equipment_loans ALTER COLUMN to_company_id DROP NOT NULL;

-- Must have either equipment_id or tool_id
ALTER TABLE public.equipment_loans DROP CONSTRAINT IF EXISTS check_item_reference;
ALTER TABLE public.equipment_loans
  ADD CONSTRAINT check_item_reference
  CHECK ((item_kind = 'equipment' AND equipment_id IS NOT NULL) OR (item_kind = 'tool' AND tool_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_equipment_loans_tool_id ON public.equipment_loans(tool_id);
CREATE INDEX IF NOT EXISTS idx_equipment_loans_holder_user ON public.equipment_loans(holder_user_id);

-- 3. Import tool RPC
CREATE OR REPLACE FUNCTION public.import_tool_row(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_tool_id uuid;
  v_code text := nullif(btrim(p->>'code'), '');
  v_name text := nullif(btrim(p->>'name'), '');
  v_qty int := COALESCE((p->>'quantity')::int, 1);
BEGIN
  IF NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'super_admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF v_code IS NULL OR v_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'code and name are required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.tools WHERE code = v_code) THEN
    RETURN jsonb_build_object('success', false, 'error', format('รหัส %s มีอยู่แล้วในระบบ', v_code));
  END IF;

  INSERT INTO public.tools (
    code, name, description, department,
    tool_category_id, tool_subcategory_id,
    brand, unit, initial_quantity, current_quantity,
    serial_number, unit_price,
    warehouse_entry_date, location_id, company_id, supplier_id,
    warranty_expiry_date, has_warranty,
    pm_interval_days,
    is_asset, asset_code, is_personal_tool,
    requires_approval, return_required,
    notes, created_by, is_active
  ) VALUES (
    v_code, v_name,
    NULLIF(p->>'description',''),
    NULLIF(p->>'department',''),
    NULLIF(p->>'tool_category_id','')::uuid,
    NULLIF(p->>'tool_subcategory_id','')::uuid,
    NULLIF(p->>'brand',''),
    COALESCE(NULLIF(p->>'unit',''), 'ชิ้น'),
    v_qty, v_qty,
    NULLIF(p->>'serial_number',''),
    COALESCE((p->>'unit_price')::numeric, 0),
    COALESCE(NULLIF(p->>'warehouse_entry_date','')::date, CURRENT_DATE),
    NULLIF(p->>'location_id','')::uuid,
    NULLIF(p->>'company_id','')::uuid,
    NULLIF(p->>'supplier_id','')::uuid,
    NULLIF(p->>'warranty_expiry_date','')::date,
    COALESCE((p->>'has_warranty')::boolean, true),
    COALESCE((p->>'pm_interval_days')::int, 30),
    COALESCE((p->>'is_asset')::boolean, false),
    NULLIF(p->>'asset_code',''),
    COALESCE((p->>'is_personal_tool')::boolean, false),
    COALESCE((p->>'requires_approval')::boolean, false),
    COALESCE((p->>'return_required')::boolean, true),
    NULLIF(p->>'notes',''),
    v_user,
    true
  ) RETURNING id INTO v_tool_id;

  RETURN jsonb_build_object('success', true, 'tool_id', v_tool_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
