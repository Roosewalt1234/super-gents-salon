
CREATE TABLE public.employee_loan_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(employee_id),
  loan_amount NUMERIC DEFAULT 0,
  loan_balance NUMERIC DEFAULT 0,
  loan_deduction_amount NUMERIC DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.employee_loan_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access employee_loan_transactions"
  ON public.employee_loan_transactions FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own employee_loan_transactions"
  ON public.employee_loan_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants WHERE tenants.id = employee_loan_transactions.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant employee_loan_transactions"
  ON public.employee_loan_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = employee_loan_transactions.tenant_id
  ));

CREATE INDEX idx_employee_loan_transactions_tenant_id ON public.employee_loan_transactions(tenant_id);
CREATE INDEX idx_employee_loan_transactions_employee_id ON public.employee_loan_transactions(employee_id);

CREATE TRIGGER update_employee_loan_transactions_updated_at
  BEFORE UPDATE ON public.employee_loan_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
