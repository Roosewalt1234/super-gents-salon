-- Fix: The existing "Tenant admin can manage own employees" policy only matched
-- tenants.owner_id = auth.uid(), blocking any tenant_admin user who was added
-- to the tenant but is not the original owner (same root cause as branch_details fix).
--
-- New policy: allow the original tenant owner OR any user with the tenant_admin
-- role whose profiles.tenant_id matches the row's tenant_id.

DROP POLICY IF EXISTS "Tenant admin can manage own employees" ON public.employees;

CREATE POLICY "Tenant admin can manage own employees"
ON public.employees FOR ALL
TO authenticated
USING (
  -- Original owner of the tenant
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = employees.tenant_id
      AND tenants.owner_id = auth.uid()
  )
  OR
  -- Any tenant_admin whose profile belongs to this tenant
  (
    public.has_role(auth.uid(), 'tenant_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tenant_id = employees.tenant_id
    )
  )
)
WITH CHECK (
  -- Original owner of the tenant
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = employees.tenant_id
      AND tenants.owner_id = auth.uid()
  )
  OR
  -- Any tenant_admin whose profile belongs to this tenant
  (
    public.has_role(auth.uid(), 'tenant_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.tenant_id = employees.tenant_id
    )
  )
);
