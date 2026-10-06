-- Harden Phase 3/4 SECURITY DEFINER helpers: revoke EXECUTE from API roles.
-- Triggers still run as the table owner; PostgREST must not expose these RPCs.

revoke all on function public.content_effective_type(public.contents) from public, anon, authenticated;
revoke all on function public.validate_structured_content() from public, anon, authenticated;
revoke all on function public.validate_content_relationship() from public, anon, authenticated;
revoke all on function public.snapshot_content_public_metadata() from public, anon, authenticated;
