-- 푸시 발송 일정 (원격 Supabase 에서만 실행. 로컬 테스트 DB 에는 pg_cron/pg_net 이 없다)
-- 사용 전: private.push_config 에 key='secret' 를 넣고, 아래 url 을 실제 배포 주소로 바꾼다.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 한국 08:00 = UTC 23:00 (전날), 한국 20:00 = UTC 11:00
select cron.schedule(
  'family-quest-push-morning',
  '0 23 * * *',
  $$ select net.http_post(
       url := 'https://family-quest-doublehryan.vercel.app/api/push/send',
       headers := jsonb_build_object('Content-Type', 'application/json',
                                     'x-push-secret', (select value from private.push_config where key = 'secret')),
       body := '{"slot":"morning"}'::jsonb) $$
);
select cron.schedule(
  'family-quest-push-evening',
  '0 11 * * *',
  $$ select net.http_post(
       url := 'https://family-quest-doublehryan.vercel.app/api/push/send',
       headers := jsonb_build_object('Content-Type', 'application/json',
                                     'x-push-secret', (select value from private.push_config where key = 'secret')),
       body := '{"slot":"evening"}'::jsonb) $$
);
