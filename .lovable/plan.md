

## Plan: Simplify Media Player Entry Form (Set Up Only)

### Understanding
From the annotated document, "จัดการ Media Player" should only be a setup page to register media players in the system -- not for warehouse entry (which is handled by "นำสินค้าใหม่เข้าระบบ"). This means removing all warehouse/financial/installation fields and keeping only the core identity fields.

### What stays (green boxes)
1. **ข้อมูลทั่วไป** — Prefix รหัส, ชื่อสินค้า, ยี่ห้อ
2. **ประเภทของสินค้า** — ระบุประเภทสินค้า, Specification

### What gets removed (red boxes)
1. **ข้อมูลทั่วไป** — ฝ่าย, บริษัทที่สั่งซื้อ, คลังสินค้า/ตำแหน่งจัดเก็บ, ผู้จัดจำหน่าย
2. **ข้อมูลเฉพาะ Media Player** — Model, S/N 1, S/N 2, Activate Windows, รูปภาพ, Note (entire card)
3. **ข้อมูลเพิ่มเติม** — Status, Name (entire card)
4. **ผูกกับป้ายโฆษณา** — ป้ายโฆษณา, วันที่ติดตั้ง (entire card)
5. **ราคาและค่าเสื่อม** — entire card
6. **ทรัพย์สิน** — entire card
7. **PO/PR** — entire card
8. **หมายเหตุ** — entire card

### Free text → Dropdown conversions (point c)
In the remaining green fields, two are still free text:
- **ชื่อสินค้า** (name) → New CRUD dropdown `MediaPlayerNameSelect` backed by a new `media_player_names` table
- **Specification** → New CRUD dropdown `SpecificationSelect` backed by a new `media_player_specifications` table

Already dropdowns (no change needed): Prefix รหัส, ยี่ห้อ (BrandSelect), ระบุประเภทสินค้า (CMSTypeSelect)

### Database changes
Two new tables:

```sql
CREATE TABLE public.media_player_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.media_player_names ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated can view, admin/staff can manage

CREATE TABLE public.media_player_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.media_player_specifications ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated can view, admin/staff can manage
```

### Code changes

1. **New component: `MediaPlayerNameSelect`** — Searchable dropdown with CRUD dialog (same pattern as `ModelSelect`)
2. **New component: `SpecificationSelect`** — Searchable dropdown with CRUD dialog (same pattern as `ModelSelect`)
3. **Update `MediaPlayerEntry.tsx`**:
   - Remove all red-box sections from the form (cards for: department/company/warehouse/supplier, media player details, additional info, billboard binding, pricing, assets, PO/PR, notes)
   - Remove related form state fields and submission logic (keep them in DB insert as null)
   - Replace `name` Input with `MediaPlayerNameSelect`
   - Replace `specification` Input with `SpecificationSelect`
   - Simplify form validation to only require: prefix, name, depreciation_months (or remove depreciation requirement since it's being removed)
   - Keep the Dashboard tab unchanged

### Agreement
Yes, I agree with your approach. Making "จัดการ Media Player" a pure setup/registration page eliminates data duplication with "นำสินค้าใหม่เข้าระบบ" and reduces the risk of processing errors. The warehouse entry flow (department, supplier, location, pricing, PO/PR, etc.) should only happen through the dedicated delivery entry process.

