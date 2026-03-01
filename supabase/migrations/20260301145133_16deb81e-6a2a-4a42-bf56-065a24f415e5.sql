
CREATE TABLE public.employee_visa_charges_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(employee_id),
  visa_charges_amount NUMERIC DEFAULT 0,
  visa_charges_balance NUMERIC DEFAULT 0,
  visa_charges_deduction_amount NUMERIC DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.employee_visa_charges_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access employee_visa_charges_transactions"
  ON public.employee_visa_charges_transactions FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own employee_visa_charges_transactions"
  ON public.employee_visa_charges_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants WHERE tenants.id = employee_visa_charges_transactions.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant employee_visa_charges_transactions"
  ON public.employee_visa_charges_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = employee_visa_charges_transactions.tenant_id
  ));

CREATE INDEX idx_visa_charges_tx_tenant_id ON public.employee_visa_charges_transactions(tenant_id);
CREATE INDEX idx_visa_charges_tx_employee_id ON public.employee_visa_charges_transactions(employee_id);

CREATE TRIGGER update_employee_visa_charges_transactions_updated_at
  BEFORE UPDATE ON public.employee_visa_charges_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
