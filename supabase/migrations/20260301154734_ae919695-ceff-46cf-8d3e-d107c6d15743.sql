
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(employee_id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  pay_period_start DATE,
  pay_period_end DATE,
  pay_month TEXT,
  total_days_worked NUMERIC DEFAULT 0,
  basic_salary NUMERIC DEFAULT 0,
  salary_earned NUMERIC DEFAULT 0,
  gross_pay NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  visa_charges_ded_amount NUMERIC DEFAULT 0,
  loan_ded_amount NUMERIC DEFAULT 0,
  adv_ded_amount NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  notes TEXT,
  pay_date DATE,
  month TEXT,
  overtime_hours NUMERIC DEFAULT 0,
  overtime_rate NUMERIC DEFAULT 0,
  overtime_amount NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access payroll_records"
  ON public.payroll_records FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own payroll_records"
  ON public.payroll_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = payroll_records.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant payroll_records"
  ON public.payroll_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = payroll_records.tenant_id
  ));

CREATE INDEX idx_payroll_records_employee_id ON public.payroll_records(employee_id);
CREATE INDEX idx_payroll_records_tenant_id ON public.payroll_records(tenant_id);
CREATE INDEX idx_payroll_records_pay_month ON public.payroll_records(pay_month);

CREATE TRIGGER update_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
