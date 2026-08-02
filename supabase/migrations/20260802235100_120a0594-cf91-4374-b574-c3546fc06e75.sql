REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_claim() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_claim_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_claim_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.item_owner(uuid) FROM anon;