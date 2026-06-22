-- Remove test account from allowlist and profiles

DELETE FROM public.profiles
WHERE lower(email) LIKE 'test999%';

DELETE FROM public.allowed_emails
WHERE lower(email) LIKE 'test999%';
