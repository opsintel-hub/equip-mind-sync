REVOKE ALL ON FUNCTION public.user_has_section(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_section_scopes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_section(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_section_scopes(uuid) TO authenticated, service_role;