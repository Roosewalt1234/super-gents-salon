
CREATE TABLE public.daily_sales (
  sale_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  branch_id UUID NOT NULL REFERENCES public.branch_details(branch_id),
  employee_id UUID REFERENCES public.employees(employee_id),
  service_id UUID REFERENCES public.default_services(service_id),
  amount NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_time TIME DEFAULT NULL,
  weekday TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT DEFAULT NULL,
  bank_charges NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin full access daily_sales"
  ON public.daily_sales FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Tenant admin can manage own sales
CREATE POLICY "Tenant admin can manage own daily_sales"
  ON public.daily_sales FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants WHERE tenants.id = daily_sales.tenant_id AND tenants.owner_id = auth.uid()
  ));

-- Staff can view tenant sales
CREATE POLICY "Staff can view tenant daily_sales"
  ON public.daily_sales FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = daily_sales.tenant_id
  ));

-- Updated_at trigger
CREATE TRIGGER update_daily_sales_updated_at
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_daily_sales_tenant_id ON public.daily_sales(tenant_id);
CREATE INDEX idx_daily_sales_branch_id ON public.daily_sales(branch_id);
CREATE INDEX idx_daily_sales_sale_date ON public.daily_sales(sale_date);
