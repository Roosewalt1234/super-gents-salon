
CREATE TABLE public.expenses_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  branch_id UUID NOT NULL REFERENCES public.branch_details(branch_id),
  employee_id UUID REFERENCES public.employees(employee_id),
  sub_category_id UUID REFERENCES public.expenses_sub_category(sub_category_id),
  category_id UUID NOT NULL REFERENCES public.expenses_category(category_id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  vendor_name TEXT,
  payment_method TEXT,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.expenses_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access expenses_register"
  ON public.expenses_register FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own expenses_register"
  ON public.expenses_register FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = expenses_register.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant expenses_register"
  ON public.expenses_register FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = expenses_register.tenant_id
  ));

CREATE INDEX idx_expenses_register_tenant_id ON public.expenses_register(tenant_id);
CREATE INDEX idx_expenses_register_branch_id ON public.expenses_register(branch_id);
CREATE INDEX idx_expenses_register_category_id ON public.expenses_register(category_id);
CREATE INDEX idx_expenses_register_transaction_date ON public.expenses_register(transaction_date);

CREATE TRIGGER update_expenses_register_updated_at
  BEFORE UPDATE ON public.expenses_register
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
