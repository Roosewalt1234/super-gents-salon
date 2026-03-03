ALTER TABLE public.branches_active_services
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);
