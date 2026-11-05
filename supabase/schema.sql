-- MyTokenWallet content schema (run in Supabase SQL Editor)
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  category text not null default '',
  tags text[] not null default '{}',
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  reading_count bigint not null default 0 check (reading_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_created_idx on public.articles(status, created_at desc);
create index if not exists articles_tags_idx on public.articles using gin(tags);

create or replace function public.is_content_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;

create policy "Admins can read admin list" on public.admin_users for select to authenticated using (public.is_content_admin());
create policy "Public can read categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.categories for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy "Public can read tags" on public.tags for select to anon, authenticated using (true);
create policy "Admins manage tags" on public.tags for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy "Public can read published articles" on public.articles for select to anon, authenticated using (status = 'published' or public.is_content_admin());
create policy "Admins create articles" on public.articles for insert to authenticated with check (public.is_content_admin());
create policy "Admins update articles" on public.articles for update to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy "Admins delete articles" on public.articles for delete to authenticated using (public.is_content_admin());

create or replace function public.increment_article_reads(article_uuid uuid)
returns void language sql security definer set search_path = public
as $$ update public.articles set reading_count = reading_count + 1 where id = article_uuid and status = 'published'; $$;
grant execute on function public.increment_article_reads(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-covers', 'article-covers', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

create policy "Public can view article covers" on storage.objects for select using (bucket_id = 'article-covers');
create policy "Admins upload article covers" on storage.objects for insert to authenticated with check (bucket_id = 'article-covers' and public.is_content_admin());
create policy "Admins update article covers" on storage.objects for update to authenticated using (bucket_id = 'article-covers' and public.is_content_admin()) with check (bucket_id = 'article-covers' and public.is_content_admin());
create policy "Admins delete article covers" on storage.objects for delete to authenticated using (bucket_id = 'article-covers' and public.is_content_admin());

-- After creating an admin user under Authentication > Users, grant access with:
-- insert into public.admin_users (user_id) values ('<AUTH_USER_UUID>');
