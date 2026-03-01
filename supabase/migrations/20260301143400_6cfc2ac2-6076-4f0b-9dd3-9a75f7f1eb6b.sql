
CREATE TABLE public.employee_advance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(employee_id),
  branch_id UUID NOT NULL REFERENCES public.branch_details(branch_id),
  amount_given NUMERIC DEFAULT 0,
  amount_deducted NUMERIC DEFAULT 0,
  advance_balance NUMERIC DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT DEFAULT NULL,
  month TEXT DEFAULT NULL,
  updated_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_advance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access employee_advance_records"
  ON public.employee_advance_records FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own employee_advance_records"
  ON public.employee_advance_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants WHERE tenants.id = employee_advance_records.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant employee_advance_records"
  ON public.employee_advance_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = employee_advance_records.tenant_id
  ));

CREATE TRIGGER update_employee_advance_records_updated_at
  BEFORE UPDATE ON public.employee_advance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_employee_advance_records_tenant_id ON public.employee_advance_records(tenant_id);
CREATE INDEX idx_employee_advance_records_employee_id ON public.employee_advance_records(employee_id);
CREATE INDEX idx_employee_advance_records_branch_id ON public.employee_advance_records(branch_id);
