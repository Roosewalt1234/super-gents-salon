
CREATE TABLE public.expenses_sub_category (
  sub_category_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_category_name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.expenses_category(category_id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses_sub_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expenses_sub_category"
  ON public.expenses_sub_category FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can manage expenses_sub_category"
  ON public.expenses_sub_category FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_expenses_sub_category_category_id ON public.expenses_sub_category(category_id);

CREATE TRIGGER update_expenses_sub_category_updated_at
  BEFORE UPDATE ON public.expenses_sub_category
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
