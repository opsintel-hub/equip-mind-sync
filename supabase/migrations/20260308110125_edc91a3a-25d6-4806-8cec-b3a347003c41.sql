INSERT INTO public.user_roles (user_id, role)
VALUES ('24f85502-35ec-48d9-9d76-d579e2c3548f', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;