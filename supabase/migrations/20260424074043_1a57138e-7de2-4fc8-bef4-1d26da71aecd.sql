-- Phase 2 cleanup: Drop unused table billboard_field_mapping
-- This table was used by an old field-mapping system that is no longer referenced anywhere in the codebase.
-- The current sync flow (sync-billboards-mssql edge function) uses hardcoded mappings.

DROP TABLE IF EXISTS public.billboard_field_mapping CASCADE;