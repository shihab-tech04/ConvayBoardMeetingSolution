-- Event-trigger-only SECURITY DEFINER function must not be directly executable via Data API.
revoke all on function public.rls_auto_enable() from PUBLIC, anon, authenticated;
