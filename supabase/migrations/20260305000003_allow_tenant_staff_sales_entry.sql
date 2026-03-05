-- Allow any authenticated user who belongs to a tenant (via profiles.tenant_id)
-- to read branches and employees, and to insert sales/attendance records.
-- This is required for the mobile Sales Entry app used by branch staff.

-- ── branch_details: staff can read their tenant's branches ──────────────────
CREATE POLICY "Tenant staff can view own branches"
ON public.branch_details FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = branch_details.tenant_id
  )
);

-- ── employees: staff can read their tenant's employees ──────────────────────
CREATE POLICY "Tenant staff can view own employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = employees.tenant_id
  )
);

-- ── daily_sales: staff can insert sales for their tenant ────────────────────
CREATE POLICY "Tenant staff can insert own daily_sales"
ON public.daily_sales FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = daily_sales.tenant_id
  )
);

-- ── daily_attendance_records: staff can insert and read for their tenant ─────
CREATE POLICY "Tenant staff can insert daily_attendance_records"
ON public.daily_attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = daily_attendance_records.tenant_id
  )
);

CREATE POLICY "Tenant staff can view daily_attendance_records"
ON public.daily_attendance_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = daily_attendance_records.tenant_id
  )
);

-- ── monthly_attendance: staff can insert and update for their tenant ─────────
CREATE POLICY "Tenant staff can insert monthly_attendance"
ON public.monthly_attendance FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = monthly_attendance.tenant_id
  )
);

CREATE POLICY "Tenant staff can update monthly_attendance"
ON public.monthly_attendance FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = monthly_attendance.tenant_id
  )
);

CREATE POLICY "Tenant staff can view monthly_attendance"
ON public.monthly_attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id  = auth.uid()
      AND profiles.tenant_id = monthly_attendance.tenant_id
  )
);
