-- Add storage_area_size column to locations table
ALTER TABLE public.locations
ADD COLUMN storage_area_size TEXT;