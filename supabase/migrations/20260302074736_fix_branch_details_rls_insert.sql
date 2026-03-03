-- Fix: Tenant admin RLS policy for branch_details was only granting access
-- to the tenant owner (tenants.owner_id = auth.uid()). This blocked any
-- tenant_admin user who was added to the tenant but is not the original owner.
--
-- New policy: allow access to the tenant owner OR any user with the
-- tenant_admin role whose profile.tenant_id matches the row's tenant_id.

DROP POLICY IF EXISTS "Tenant admin can manage own branches" ON public.branch_details;

CREATE POLICY "Tenant admin can manage own branches"
ON public.branch_details FOR ALL
TO authenticated
USING (
  -- Original owner of the tenant
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = branch_details.tenant_id
      AND tenants.owner_id = auth.uid()
  )
  OR
  -- Any tenant_admin whose profile belongs to this tenant
  (
    public.has_role(auth.uid(), 'tenant_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tenant_id = branch_details.tenant_id
    )
  )
)
WITH CHECK (
  -- Original owner of the tenant
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = branch_details.tenant_id
      AND tenants.owner_id = auth.uid()
  )
  OR
  -- Any tenant_admin whose profile belongs to this tenant
  (
    public.has_role(auth.uid(), 'tenant_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tenant_id = branch_details.tenant_id
    )
  )
);
