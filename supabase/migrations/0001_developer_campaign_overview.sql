-- Optional, developer-only view of existing private Storage saves.
-- Run in the Supabase SQL Editor. No application role receives access.
create schema if not exists developer;
revoke all on schema developer from public, anon, authenticated;

create or replace view developer.campaign_overview as
select
  o.id as object_id,
  u.id as user_id,
  u.email as account_email,
  coalesce(u.raw_user_meta_data ->> 'username', u.raw_user_meta_data ->> 'full_name') as account_name,
  regexp_replace(split_part(o.name, '/', 2), '\.json$', '') as campaign_id,
  o.name as storage_path,
  nullif(o.metadata ->> 'size', '')::bigint as bytes,
  o.created_at,
  o.updated_at
from storage.objects o
left join auth.users u on u.id::text = split_part(o.name, '/', 1)
where o.bucket_id = 'campaigns'
  and o.name ~ '^[0-9a-f-]+/[0-9a-f-]+\.json$';

revoke all on developer.campaign_overview from public, anon, authenticated;
comment on view developer.campaign_overview is 'Developer-only index of private Novus Arbitrium campaign files';
