-- 로컬 PostgreSQL 에서 마이그레이션을 검증하기 위한 Supabase 흉내.
-- 실제 Supabase 에는 적용하지 않는다.
-- Supabase 는 확장을 extensions 스키마에 설치한다
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);
-- Supabase 의 auth.uid(): JWT claims 의 sub
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end;
$$;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
-- Supabase 처럼 anon/authenticated 가 auth.uid() 를 직접 호출할 수 있게
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
