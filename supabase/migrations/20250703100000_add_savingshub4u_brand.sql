-- Add savingshub4u brand to the brands dropdown

INSERT INTO public.brands (name)
VALUES ('savingshub4u')
ON CONFLICT (name) DO NOTHING;
