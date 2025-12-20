-- สร้างตารางสำหรับเก็บสิทธิ์ตามฟังก์ชัน
CREATE TABLE public.user_function_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name)
);

-- Enable RLS
ALTER TABLE public.user_function_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own function permissions
CREATE POLICY "Users can view own function permissions" 
ON public.user_function_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Admins can manage all function permissions
CREATE POLICY "Admins can manage all function permissions" 
ON public.user_function_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- สร้างฟังก์ชันตรวจสอบสิทธิ์ตามฟังก์ชัน
CREATE OR REPLACE FUNCTION public.has_function_permission(_user_id UUID, _function_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_function_permissions
    WHERE user_id = _user_id
      AND function_name = _function_name
      AND can_access = true
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;