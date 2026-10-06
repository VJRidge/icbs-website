-- Phase 3 transaction boundary: add one storage discriminator without touching
-- existing page/post rows. PostgreSQL requires the new enum value to be committed
-- before a later migration uses it.
alter type public.content_kind add value if not exists 'custom';
