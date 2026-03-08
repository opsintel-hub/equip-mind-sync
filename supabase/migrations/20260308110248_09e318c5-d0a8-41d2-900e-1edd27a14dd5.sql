INSERT INTO public.user_roles (user_id, role)
VALUES ('60910de4-234e-4edd-8dce-f3e6bff9232f', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;