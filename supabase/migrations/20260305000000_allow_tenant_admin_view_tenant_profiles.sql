-- Allow tenant_admin to view all profiles that belong to their tenant
-- This is needed for the Users & Permissions page (/user_permissions)

CREATE POLICY "Tenant admin can view tenant profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS my_profile
      JOIN public.user_roles AS my_role ON my_role.user_id = my_profile.user_id
      WHERE my_profile.user_id  = auth.uid()
        AND my_profile.tenant_id = profiles.tenant_id
        AND my_role.role         = 'tenant_admin'
    )
  );

-- Allow tenant_admin to update profiles within their tenant
-- (e.g. editing display name from the Users tab)
CREATE POLICY "Tenant admin can update tenant profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS my_profile
      JOIN public.user_roles AS my_role ON my_role.user_id = my_profile.user_id
      WHERE my_profile.user_id  = auth.uid()
        AND my_profile.tenant_id = profiles.tenant_id
        AND my_role.role         = 'tenant_admin'
    )
  );
