-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'warehouse_staff', 'manager');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create locations table (ตำแหน่งจัดเก็บ)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Create equipment table (อุปกรณ์)
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0 NOT NULL,
  min_stock_level INTEGER DEFAULT 0,
  location_id UUID REFERENCES public.locations(id),
  expiry_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Create goods_receipt table (การรับเข้า)
CREATE TABLE public.goods_receipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT UNIQUE NOT NULL,
  receipt_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  equipment_id UUID REFERENCES public.equipment(id) NOT NULL,
  quantity INTEGER NOT NULL,
  location_id UUID REFERENCES public.locations(id) NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  notes TEXT,
  status TEXT DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create goods_issue table (การเบิกจ่าย)
CREATE TABLE public.goods_issue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  requester TEXT NOT NULL,
  equipment_id UUID REFERENCES public.equipment(id) NOT NULL,
  quantity INTEGER NOT NULL,
  location_id UUID REFERENCES public.locations(id) NOT NULL,
  purpose TEXT,
  notes TEXT,
  status TEXT DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Create billboards table (ป้ายโฆษณา)
CREATE TABLE public.billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_code TEXT UNIQUE NOT NULL,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  size TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  installation_date DATE,
  removal_date DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Create billboard_equipment table (ความสัมพันธ์ระหว่างป้ายและอุปกรณ์)
CREATE TABLE public.billboard_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id UUID REFERENCES public.billboards(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.equipment(id) NOT NULL,
  quantity INTEGER NOT NULL,
  installation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_issue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_equipment ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billboards_updated_at BEFORE UPDATE ON public.billboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for locations
CREATE POLICY "All authenticated users can view locations" ON public.locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for equipment
CREATE POLICY "All authenticated users can view equipment" ON public.equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admins can insert equipment" ON public.equipment
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );

CREATE POLICY "Staff and admins can update equipment" ON public.equipment
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );

CREATE POLICY "Only admins can delete equipment" ON public.equipment
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for goods_receipt
CREATE POLICY "All authenticated users can view goods receipts" ON public.goods_receipt
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admins can create goods receipts" ON public.goods_receipt
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );

-- RLS Policies for goods_issue
CREATE POLICY "All authenticated users can view goods issues" ON public.goods_issue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admins can create goods issues" ON public.goods_issue
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );

-- RLS Policies for billboards
CREATE POLICY "All authenticated users can view billboards" ON public.billboards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admins can manage billboards" ON public.billboards
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );

-- RLS Policies for billboard_equipment
CREATE POLICY "All authenticated users can view billboard equipment" ON public.billboard_equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admins can manage billboard equipment" ON public.billboard_equipment
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'warehouse_staff')
  );