-- Allow tenant_admin (and superadmin) to insert, update, delete expense categories and sub-categories.
-- Currently only superadmin has write access; this extends it to tenant_admin as well.

CREATE POLICY "Tenant admin can manage expenses_category"
  ON public.expenses_category
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role));

CREATE POLICY "Tenant admin can manage expenses_sub_category"
  ON public.expenses_sub_category
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role));
