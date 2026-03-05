CREATE TABLE public.daily_attendance_records (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id                   uuid        NOT NULL REFERENCES public.branch_details(branch_id) ON DELETE CASCADE,
  employee_id                 uuid        NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  date                        date        NOT NULL,
  check_in_time               timestamptz,
  check_out_time              timestamptz,
  status                      text        NOT NULL DEFAULT 'present',
  face_recognition_confidence numeric(5,4),
  face_session_id             text,
  recognition_method          text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_attendance_tenant    ON public.daily_attendance_records (tenant_id);
CREATE INDEX idx_daily_attendance_branch    ON public.daily_attendance_records (branch_id);
CREATE INDEX idx_daily_attendance_employee  ON public.daily_attendance_records (employee_id);
CREATE INDEX idx_daily_attendance_date      ON public.daily_attendance_records (date);
CREATE INDEX idx_daily_attendance_emp_date  ON public.daily_attendance_records (employee_id, date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_daily_attendance_updated_at
BEFORE UPDATE ON public.daily_attendance_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.daily_attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access on daily_attendance_records"
ON public.daily_attendance_records FOR ALL TO authenticated
USING  (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage daily_attendance_records"
ON public.daily_attendance_records FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = daily_attendance_records.tenant_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = daily_attendance_records.tenant_id
  )
);

