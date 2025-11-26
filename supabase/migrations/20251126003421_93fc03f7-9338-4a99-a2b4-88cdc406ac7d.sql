-- Create user_departments table for department-based permissions
CREATE TABLE public.user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, department)
);

-- Enable RLS
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- Policies for user_departments
CREATE POLICY "Admins can manage all user departments"
ON public.user_departments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own department permissions"
ON public.user_departments
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check department permission
CREATE OR REPLACE FUNCTION public.has_department_permission(
  _user_id uuid,
  _department text,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
      ELSE
        CASE _permission
          WHEN 'view' THEN COALESCE((SELECT can_view FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'create' THEN COALESCE((SELECT can_create FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'edit' THEN COALESCE((SELECT can_edit FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'delete' THEN COALESCE((SELECT can_delete FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          ELSE false
        END
    END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_user_departments_updated_at
BEFORE UPDATE ON public.user_departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.user_departments IS 'Department-based permissions for users';
COMMENT ON FUNCTION public.has_department_permission IS 'Check if user has specific permission for a department';