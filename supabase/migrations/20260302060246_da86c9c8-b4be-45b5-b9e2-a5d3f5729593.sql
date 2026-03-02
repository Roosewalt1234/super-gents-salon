INSERT INTO public.user_roles (user_id, role) 
VALUES ('88adb4aa-8517-4031-9a52-f0f27ffe8193', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;