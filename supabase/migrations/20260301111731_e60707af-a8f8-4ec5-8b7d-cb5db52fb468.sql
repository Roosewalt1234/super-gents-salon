
CREATE TABLE public.branch_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_name text NOT NULL,
  location text,
  phone text,
  description text,
  services_count integer DEFAULT 0,
  barbers_count integer DEFAULT 0,
  status text DEFAULT 'active',
  has_partnership boolean DEFAULT false,
  partner_company_name text,
  partner_name text,
  investment_percentage numeric(5,2),
  profit_sharing_percentage numeric(5,2),
  has_vat boolean DEFAULT false,
  number_of_chairs integer DEFAULT 0,
  shop_number text,
  license_number text,
  license_expiry_date date,
  rental_agreement_number text,
  rental_agreement_expiry_date date,
  rental_agreement_start_date date,
  rent_amount numeric(10,2),
  number_of_cheques integer DEFAULT 0,
  establishment_card_number text,
  establishment_card_expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.branch_details ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin full access branch_details"
ON public.branch_details FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Tenant admin can manage their own branches
CREATE POLICY "Tenant admin can manage own branches"
ON public.branch_details FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = branch_details.tenant_id
    AND tenants.owner_id = auth.uid()
  )
);

-- Staff can view branches of their tenant
CREATE POLICY "Staff can view tenant branches"
ON public.branch_details FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.tenant_id = branch_details.tenant_id
  )
);

-- Auto-update updated_at
CREATE TRIGGER update_branch_details_updated_at
BEFORE UPDATE ON public.branch_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
