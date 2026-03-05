-- Fix: Same root cause as branch_details / employees / expenses_register / daily_sales.
-- The "Tenant admin can manage own ..." policies on all tables below only matched
-- tenants.owner_id = auth.uid(), blocking any tenant_admin user who was added to the
-- tenant but is not the original owner.
--
-- Each block is guarded so it only runs if the table exists in this database.

DO $$
BEGIN

  -- ── employee_advance_records ───────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_advance_records'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own employee_advance_records" ON public.employee_advance_records;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own employee_advance_records"
      ON public.employee_advance_records FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_advance_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_advance_records.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_advance_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_advance_records.tenant_id
          )
        )
      )
    $policy$;
  END IF;

  -- ── employee_liability_records ─────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_liability_records'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own employee_liability_records" ON public.employee_liability_records;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own employee_liability_records"
      ON public.employee_liability_records FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_liability_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_liability_records.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_liability_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_liability_records.tenant_id
          )
        )
      )
    $policy$;
  END IF;

  -- ── employee_loan_transactions ─────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_loan_transactions'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own employee_loan_transactions" ON public.employee_loan_transactions;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own employee_loan_transactions"
      ON public.employee_loan_transactions FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_loan_transactions.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_loan_transactions.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_loan_transactions.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_loan_transactions.tenant_id
          )
        )
      )
    $policy$;
  END IF;

  -- ── employee_visa_charges_transactions ────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employee_visa_charges_transactions'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own employee_visa_charges_transactions" ON public.employee_visa_charges_transactions;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own employee_visa_charges_transactions"
      ON public.employee_visa_charges_transactions FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_visa_charges_transactions.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_visa_charges_transactions.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = employee_visa_charges_transactions.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = employee_visa_charges_transactions.tenant_id
          )
        )
      )
    $policy$;
  END IF;

  -- ── monthly_attendance ─────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'monthly_attendance'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own monthly_attendance" ON public.monthly_attendance;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own monthly_attendance"
      ON public.monthly_attendance FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = monthly_attendance.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = monthly_attendance.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = monthly_attendance.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = monthly_attendance.tenant_id
          )
        )
      )
    $policy$;
  END IF;

  -- ── payroll_records ────────────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payroll_records'
  ) THEN
    DROP POLICY IF EXISTS "Tenant admin can manage own payroll_records" ON public.payroll_records;

    EXECUTE $policy$
      CREATE POLICY "Tenant admin can manage own payroll_records"
      ON public.payroll_records FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = payroll_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = payroll_records.tenant_id
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenants
          WHERE tenants.id = payroll_records.tenant_id
            AND tenants.owner_id = auth.uid()
        )
        OR (
          public.has_role(auth.uid(), 'tenant_admin'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.tenant_id = payroll_records.tenant_id
          )
        )
      )
    $policy$;
  END IF;

END;
$$;
