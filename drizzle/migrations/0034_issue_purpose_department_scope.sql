ALTER TABLE public.issue_purposes
  ADD COLUMN IF NOT EXISTS allowed_department_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_section_ids uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.issue_purposes.allowed_department_ids IS 'Empty = all departments may use this purpose';
COMMENT ON COLUMN public.issue_purposes.allowed_section_ids IS 'Optional section narrowing; a department with no selected sections allows all its sections';