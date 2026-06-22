-- Update team emails to firstname.lastname@tgtnexus.net format

DELETE FROM public.allowed_emails;

INSERT INTO public.allowed_emails (email, name, role) VALUES
  ('abdullah.zahid@tgtnexus.net', 'Abdullah', 'Manager'),
  ('gufran.ahmed@tgtnexus.net', 'Gufran', 'Team Lead'),
  ('yasal.khan@tgtnexus.net', 'Yasal', 'Developer'),
  ('usman.tariq@tgtnexus.net', 'Usman', 'Developer'),
  ('hammad.noor@tgtnexus.net', 'Hammad', 'Designer'),
  ('daniyal.naveed@tgtnexus.net', 'Daniyal', 'SEO');

UPDATE public.profiles SET email = 'abdullah.zahid@tgtnexus.net' WHERE email = 'abdullah@tgtnexus.net';
UPDATE public.profiles SET email = 'gufran.ahmed@tgtnexus.net' WHERE email = 'gufran@tgtnexus.net';
UPDATE public.profiles SET email = 'yasal.khan@tgtnexus.net' WHERE email = 'yasal@tgtnexus.net';
UPDATE public.profiles SET email = 'usman.tariq@tgtnexus.net' WHERE email = 'usman@tgtnexus.net';
UPDATE public.profiles SET email = 'hammad.noor@tgtnexus.net' WHERE email = 'hammad@tgtnexus.net';
UPDATE public.profiles SET email = 'daniyal.naveed@tgtnexus.net' WHERE email = 'daniyal@tgtnexus.net';
