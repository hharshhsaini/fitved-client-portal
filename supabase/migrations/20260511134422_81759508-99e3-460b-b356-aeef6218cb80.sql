REVOKE EXECUTE ON FUNCTION public.get_my_society_batches() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_trainer_client_pauses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_society_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_client_pauses() TO authenticated;