
-- Remove tenant-specific RLS policies
DROP POLICY "Superadmin full access services" ON public.services;
DROP POLICY "Tenant admin can manage own services" ON public.services;
DROP POLICY "Staff can view tenant services" ON public.services;
DROP INDEX idx_services_tenant_id;

-- Remove tenant_id column
ALTER TABLE public.services DROP COLUMN tenant_id;

-- Add public read policy for all authenticated users
CREATE POLICY "Authenticated users can view services"
ON public.services FOR SELECT
TO authenticated
USING (true);

-- Only superadmin can manage services
CREATE POLICY "Superadmin can manage services"
ON public.services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));
