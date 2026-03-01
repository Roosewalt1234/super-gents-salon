
CREATE TABLE public.monthly_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(employee_id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  month TEXT,
  total_days_worked NUMERIC DEFAULT 0,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.monthly_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access monthly_attendance"
  ON public.monthly_attendance FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage own monthly_attendance"
  ON public.monthly_attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = monthly_attendance.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Staff can view tenant monthly_attendance"
  ON public.monthly_attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = monthly_attendance.tenant_id
  ));

CREATE INDEX idx_monthly_attendance_employee_id ON public.monthly_attendance(employee_id);
CREATE INDEX idx_monthly_attendance_tenant_id ON public.monthly_attendance(tenant_id);

CREATE TRIGGER update_monthly_attendance_updated_at
  BEFORE UPDATE ON public.monthly_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
