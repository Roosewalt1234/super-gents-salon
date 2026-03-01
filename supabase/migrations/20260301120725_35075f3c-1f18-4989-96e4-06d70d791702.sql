
CREATE TABLE public.services (
  service_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  service_name text NOT NULL,
  description text,
  service_duration integer,
  price numeric DEFAULT 0,
  default_price numeric DEFAULT 0,
  image_url text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access services"
ON public.services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Tenant admin can manage own services"
ON public.services FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenants
  WHERE tenants.id = services.tenant_id AND tenants.owner_id = auth.uid()
));

CREATE POLICY "Staff can view tenant services"
ON public.services FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = services.tenant_id
));

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_services_tenant_id ON public.services(tenant_id);
