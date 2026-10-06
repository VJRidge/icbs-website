-- Pending-review status enum value (must commit before policies use it).
alter type public.content_status add value if not exists 'pending_review';
