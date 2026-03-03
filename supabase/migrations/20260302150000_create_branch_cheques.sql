CREATE TABLE public.branch_cheques (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid        NOT NULL,
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cheque_number text,
  cheque_amount numeric(10,2) NOT NULL DEFAULT 0,
  cheque_date   date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_cheques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access on branch_cheques"
ON public.branch_cheques FOR ALL TO authenticated
USING  (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admin can manage branch cheques"
ON public.branch_cheques FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.tenant_id = branch_cheques.tenant_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.tenant_id = branch_cheques.tenant_id
  )
);
