
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  visa_branch_id uuid REFERENCES public.branch_details(id),
  assigned_branch_id uuid REFERENCES public.branch_details(id),
  employee_name text NOT NULL,
  employee_number text,
  position text,
  employment_type text DEFAULT 'full_time',
  food_allowance numeric DEFAULT 0,
  basic_salary numeric DEFAULT 0,
  ot_amount numeric DEFAULT 0,
  accommodation_amount numeric DEFAULT 0,
  transport_amount numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  loan_balance numeric DEFAULT 0,
  visa_charges_bal numeric DEFAULT 0,
  advance_balance numeric DEFAULT 0,
  email text,
  phone text,
  date_of_birth date,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  hire_date date,
  is_archived boolean DEFAULT false,
  gender text,
  status text DEFAULT 'active',
  profile_photo_url text,
  notes text,
  nationality text,
  visa_issued_by text,
  visa_expiry_date date,
  emirates_id_number text,
  emirates_id_expiry_date date,
  ohc_number text,
  ohc_expiry_date date,
  passport_number text,
  passport_issue_date date,
  passport_expiry_date date,
  passport_issuing_country text,
  iloe_insurance_number text,
  iloe_insurance_expiry_date date,
  labor_card_number text,
  labor_card_expiry_date date,
  part_time_card_number text,
  part_time_card_expiry_date date,
  medical_insurance_number text,
  medical_insurance_expiry_date date,
  recommended_by text,
  current_visa_status text,
  current_visa_expiry_date date,
  outstanding_loan_amount numeric DEFAULT 0,
  home_country_contact text,
  referred_by text,
  face_image_url text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin full access employees"
ON public.employees FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

-- Tenant admin can manage own employees
CREATE POLICY "Tenant admin can manage own employees"
ON public.employees FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenants
  WHERE tenants.id = employees.tenant_id AND tenants.owner_id = auth.uid()
));

-- Staff can view tenant employees
CREATE POLICY "Staff can view tenant employees"
ON public.employees FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = employees.tenant_id
));

-- Auto-update updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX idx_employees_assigned_branch_id ON public.employees(assigned_branch_id);
CREATE INDEX idx_employees_visa_branch_id ON public.employees(visa_branch_id);
CREATE INDEX idx_employees_status ON public.employees(status);
