-- Create user_nav_permissions table for navigation access control
CREATE TABLE IF NOT EXISTS public.user_nav_permissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nav_item_id  text NOT NULL,
  can_view     boolean NOT NULL DEFAULT false,
  can_create   boolean NOT NULL DEFAULT false,
  can_edit     boolean NOT NULL DEFAULT false,
  can_delete   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nav_item_id)
);

ALTER TABLE public.user_nav_permissions ENABLE ROW LEVEL SECURITY;

-- Tenant admin can manage nav permissions for users in their tenant
CREATE POLICY "Tenant admin can manage nav permissions"
ON public.user_nav_permissions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Users can view their own nav permissions
CREATE POLICY "Users can view own nav permissions"
ON public.user_nav_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- Create user_branch_permissions table for branch access control
CREATE TABLE IF NOT EXISTS public.user_branch_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id   uuid NOT NULL REFERENCES public.branch_details(branch_id) ON DELETE CASCADE,
  can_view    boolean NOT NULL DEFAULT false,
  can_create  boolean NOT NULL DEFAULT false,
  can_edit    boolean NOT NULL DEFAULT false,
  can_delete  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

ALTER TABLE public.user_branch_permissions ENABLE ROW LEVEL SECURITY;

-- Tenant admin can manage branch permissions for users in their tenant
CREATE POLICY "Tenant admin can manage branch permissions"
ON public.user_branch_permissions FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin'::app_role)
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Users can view their own branch permissions
CREATE POLICY "Users can view own branch permissions"
ON public.user_branch_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());
