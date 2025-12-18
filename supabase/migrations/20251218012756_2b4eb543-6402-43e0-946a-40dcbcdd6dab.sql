-- Add department column to locations table for warehouse-department relationship
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS department text;