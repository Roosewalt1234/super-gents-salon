-- Fix infinite RLS recursion on profiles table.
-- The previous policies queried profiles from within a profiles RLS policy,
-- causing PostgreSQL to recurse infinitely → HTTP 500.
--
-- Solution: use a SECURITY DEFINER function that bypasses RLS to read
-- the current user's own tenant_id, then use that in a non-recursive policy.

DROP POLICY IF EXISTS "Tenant admin can view tenant profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Tenant admin can update tenant profiles" ON public.profiles;

-- Helper: returns the tenant_id of the currently logged-in user.
-- SECURITY DEFINER runs as the function owner (bypasses RLS → no recursion).
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM   public.profiles
  WHERE  user_id = auth.uid()
  LIMIT  1;
$$;

-- Tenant admin can SELECT any profile that belongs to their tenant
CREATE POLICY "Tenant admin can view tenant profiles"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_my_tenant_id()
    AND public.has_role(auth.uid(), 'tenant_admin')
  );

-- Tenant admin can UPDATE any profile that belongs to their tenant
CREATE POLICY "Tenant admin can update tenant profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_my_tenant_id()
    AND public.has_role(auth.uid(), 'tenant_admin')
  );
