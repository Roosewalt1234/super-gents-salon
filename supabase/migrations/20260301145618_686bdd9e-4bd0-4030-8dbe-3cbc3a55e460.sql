
CREATE TABLE public.expenses_category (
  category_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expenses_category"
  ON public.expenses_category FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can manage expenses_category"
  ON public.expenses_category FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_expenses_category_updated_at
  BEFORE UPDATE ON public.expenses_category
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
