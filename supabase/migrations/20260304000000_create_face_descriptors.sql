-- Create face_descriptors table for storing ArcFace embeddings per employee
CREATE TABLE IF NOT EXISTS public.face_descriptors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  employee_id  uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  descriptor   jsonb NOT NULL,                -- 512-dim ArcFace float array
  model_name   text NOT NULL DEFAULT 'ArcFace',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast tenant-scoped lookups during recognition
CREATE INDEX IF NOT EXISTS idx_face_descriptors_tenant
  ON public.face_descriptors (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_face_descriptors_employee
  ON public.face_descriptors (employee_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_face_descriptors_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_face_descriptors_updated_at
  BEFORE UPDATE ON public.face_descriptors
  FOR EACH ROW EXECUTE FUNCTION public.update_face_descriptors_updated_at();

-- RLS
ALTER TABLE public.face_descriptors ENABLE ROW LEVEL SECURITY;

-- Superadmin: full access
CREATE POLICY "superadmin_face_descriptors_all"
  ON public.face_descriptors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Tenant admin: full access scoped to their tenant
CREATE POLICY "tenant_admin_face_descriptors_all"
  ON public.face_descriptors FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );
