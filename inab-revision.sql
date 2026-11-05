-- INAB existing-site upgrade. Preserves existing rows and original media files.
-- Run only in jwfrgkfkwaedhnjmhuzv. Admin identity verified against the existing account.
begin;

create or replace function public.inab_is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce(auth.uid() = 'a1fc5fe2-5ee5-49fd-914d-b29f0a72bd32'::uuid, false) $$;
revoke all on function public.inab_is_admin() from public;
grant execute on function public.inab_is_admin() to anon, authenticated;

alter table public.schedule_events add column if not exists end_date date;
alter table public.schedule_events add column if not exists public_title text not null default '';
alter table public.schedule_events add column if not exists client_name text not null default '';
alter table public.schedule_events add column if not exists private_memo text not null default '';
alter table public.schedule_events add column if not exists quantity integer;
update public.schedule_events set quantity = greatest(1, coalesce((substring(label from '([0-9]+)\s*건'))::integer,1)) where quantity is null;
alter table public.schedule_events alter column quantity set default 1;
alter table public.schedule_events alter column quantity set not null;
alter table public.schedule_events add column if not exists client_display text generated always as
  (case when btrim(client_name) = '' then '' else left(btrim(client_name),1) || '**님' end) stored;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='inab_schedule_dates_valid') then
    alter table public.schedule_events add constraint inab_schedule_dates_valid check(end_date is null or end_date >= event_date);
  end if;
  if not exists(select 1 from pg_constraint where conname='inab_schedule_quantity_valid') then
    alter table public.schedule_events add constraint inab_schedule_quantity_valid check(quantity between 1 and 1000);
  end if;
end $$;

alter table public.portfolio_items add column if not exists credit text not null default '';
alter table public.portfolio_items add column if not exists work_date date;
alter table public.portfolio_items add column if not exists client_name text not null default '';
alter table public.portfolio_items add column if not exists client_display text generated always as
  (case when btrim(client_name) = '' then '' else left(btrim(client_name),1) || '**님' end) stored;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null default '', url text not null unique,
  storage_path text not null default '', mime_type text not null default '',
  category text not null default '', tags text not null default '',
  size_bytes bigint not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.schedule_day_private (
  calendar text not null check(calendar in ('package','nilo')),
  event_date date not null, private_memo text not null default '',
  primary key(calendar,event_date)
);
alter table public.media_assets enable row level security;
alter table public.schedule_day_private enable row level security;
revoke all on public.media_assets, public.schedule_day_private from anon, public;
grant select,insert,update,delete on public.media_assets,public.schedule_day_private to authenticated;
drop policy if exists inab_media_admin on public.media_assets;
create policy inab_media_admin on public.media_assets for all to authenticated
  using((select public.inab_is_admin())) with check((select public.inab_is_admin()));
drop policy if exists inab_day_admin on public.schedule_day_private;
create policy inab_day_admin on public.schedule_day_private for all to authenticated
  using((select public.inab_is_admin())) with check((select public.inab_is_admin()));

-- Restrict the existing editor write paths to its existing administrator.
do $$ declare item record; begin
  for item in select schemaname,tablename,policyname,cmd from pg_policies
    where schemaname='public' and tablename in
      ('site_content','portfolio_items','collab_artists','price_packages','price_options',
       'commission_steps','commission_notices','inquiry_forms','faq_items','notice_posts','shop_items','schedule_events')
      and cmd in ('INSERT','UPDATE','DELETE')
  loop
    if item.cmd='INSERT' then
      execute format('alter policy %I on %I.%I to authenticated with check ((select public.inab_is_admin()))',item.policyname,item.schemaname,item.tablename);
    elsif item.cmd='UPDATE' then
      execute format('alter policy %I on %I.%I to authenticated using ((select public.inab_is_admin())) with check ((select public.inab_is_admin()))',item.policyname,item.schemaname,item.tablename);
    else
      execute format('alter policy %I on %I.%I to authenticated using ((select public.inab_is_admin()))',item.policyname,item.schemaname,item.tablename);
    end if;
  end loop;
end $$;

-- Public reads cannot select the raw client name or private notes, even through REST.
drop policy if exists schedule_events_read on public.schedule_events;
drop policy if exists portfolio_items_read on public.portfolio_items;
drop policy if exists inab_schedule_public_read on public.schedule_events;
drop policy if exists inab_schedule_admin_read on public.schedule_events;
drop policy if exists inab_portfolio_public_read on public.portfolio_items;
drop policy if exists inab_portfolio_admin_read on public.portfolio_items;
create policy inab_schedule_public_read on public.schedule_events for select to anon using(true);
create policy inab_schedule_admin_read on public.schedule_events for select to authenticated using((select public.inab_is_admin()));
create policy inab_portfolio_public_read on public.portfolio_items for select to anon using(true);
create policy inab_portfolio_admin_read on public.portfolio_items for select to authenticated using((select public.inab_is_admin()));
revoke select on public.schedule_events,public.portfolio_items from anon,public;
grant select (id,calendar,event_date,kind,label,end_date,public_title,quantity,client_display) on public.schedule_events to anon;
grant select (id,title,meta,description,image_url,images,tag,anchor,fit,focus_x,focus_y,featured,sort_order,created_at,credit,work_date,client_display) on public.portfolio_items to anon;
grant select on public.schedule_events,public.portfolio_items to authenticated;
create or replace view public.schedule_events_public with (security_invoker=true) as
  select id,calendar,event_date,kind,label,end_date,public_title,quantity,client_display from public.schedule_events;
create or replace view public.portfolio_items_public with (security_invoker=true) as
  select id,title,meta,description,image_url,images,tag,anchor,fit,focus_x,focus_y,featured,sort_order,created_at,credit,work_date,client_display from public.portfolio_items;
grant select on public.schedule_events_public,public.portfolio_items_public to anon,authenticated;

alter policy inquiries_read on public.inquiries to authenticated using((select public.inab_is_admin()));
alter policy inquiries_delete on public.inquiries to authenticated using((select public.inab_is_admin()));

-- Existing public image URLs stay public; listing, changing and deleting files require admin.
alter policy site_images_read on storage.objects to authenticated using(bucket_id='site-images' and (select public.inab_is_admin()));
alter policy site_images_insert on storage.objects to authenticated with check(bucket_id='site-images' and (select public.inab_is_admin()));
alter policy site_images_update on storage.objects to authenticated using(bucket_id='site-images' and (select public.inab_is_admin())) with check(bucket_id='site-images' and (select public.inab_is_admin()));
alter policy site_images_delete on storage.objects to authenticated using(bucket_id='site-images' and (select public.inab_is_admin()));

-- Register the existing uploads without downloading, recompressing or moving them.
insert into public.media_assets(name,url,storage_path,mime_type,size_bytes,created_at)
select regexp_replace(name,'^.*/',''),
  'https://jwfrgkfkwaedhnjmhuzv.supabase.co/storage/v1/object/public/site-images/'||name,
  name,coalesce(metadata->>'mimetype',''),coalesce((metadata->>'size')::bigint,0),created_at
from storage.objects where bucket_id='site-images'
on conflict(url) do nothing;
with urls as (
  select image_url as url from public.portfolio_items union all
  select regexp_split_to_table(images,E'\n') from public.portfolio_items union all
  select image_url from public.shop_items union all
  select regexp_split_to_table(images,E'\n') from public.shop_items union all
  select regexp_split_to_table(images,E'\n') from public.notice_posts union all
  select image_url from public.collab_artists union all
  select value from public.site_content cross join lateral jsonb_each_text(data)
    where key like 'img_%' or key in ('home_hero_image','profile_image','seo_image')
)
insert into public.media_assets(name,url)
select regexp_replace(btrim(url),'^.*/',''),btrim(url) from urls
where btrim(url)<>'' and (url ~ '^https?://' or url like 'assets/%')
on conflict(url) do nothing;

notify pgrst,'reload schema';
commit;
