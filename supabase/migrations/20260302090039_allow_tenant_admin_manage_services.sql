-- default_services was previously restricted to superadmin-only writes.
-- Tenant admins need to be able to INSERT, UPDATE and DELETE services
-- from the global catalog as part of the Services management page.

CREATE POLICY "Tenant admin can manage services"
ON public.default_services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'tenant_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'tenant_admin'::app_role));
