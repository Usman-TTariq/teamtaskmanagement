-- Enable realtime push for in-app notification toasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
