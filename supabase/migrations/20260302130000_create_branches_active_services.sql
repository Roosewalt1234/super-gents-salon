-- branches_active_services
-- Stores which services each branch offers and at what price.
-- Linked to default_services (global catalog) and scoped to tenant.

CREATE TABLE public.branches_active_services (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid         NOT NULL,
  service_id  uuid         NOT NULL REFERENCES public.default_services(service_id) ON DELETE CASCADE,
  tenant_id   uuid         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active   boolean      NOT NULL DEFAULT true,
  price       numeric(10,2),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(branch_id, service_id)
);

ALTER TABLE public.branches_active_services ENABLE ROW LEVEL SECURITY;

-- Superadmin: full access
CREATE POLICY "Superadmin full access on branches_active_services"
ON public.branches_active_services FOR ALL TO authenticated
USING  (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Tenant admin: manage their own tenant's rows
CREATE POLICY "Tenant admin can manage branch services"
ON public.branches_active_services FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.tenant_id = branches_active_services.tenant_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.tenant_id = branches_active_services.tenant_id
  )
);
