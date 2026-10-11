-- 보안 권고 반영 (Supabase advisor):
--  * security definer 함수는 anon 이 호출할 수 없게 하고 authenticated 에만 허용
--  * 보조 함수의 search_path 고정
revoke execute on function public.create_family(text, text, jsonb) from anon, public;
revoke execute on function public.set_admin_pin(text) from anon, public;
revoke execute on function public.verify_admin_pin(text) from anon, public;
revoke execute on function public.my_family_id() from anon, public;
grant execute on function public.create_family(text, text, jsonb) to authenticated;
grant execute on function public.set_admin_pin(text) to authenticated;
grant execute on function public.verify_admin_pin(text) to authenticated;
grant execute on function public.my_family_id() to authenticated;

alter function public.seoul_today() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
