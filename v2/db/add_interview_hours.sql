-- =========================================================
-- めっちゃかんご：面談の受付時間のマスタ（曜日ごと）
-- Supabase の SQL Editor に貼り付けて「Run」してください（何回実行しても大丈夫です）。
-- ・既存のテーブルは消しません。新しいテーブルを足すだけです。
-- ・先に add_interview.sql を実行しておいてください。
-- ・管理画面の「マスタ」→「面談の受付時間」で、曜日ごとに設定できます（管理者だけ）。
-- =========================================================

create table if not exists interview_hours_master (
  weekday     smallint primary key check (weekday between 0 and 6),   -- 0 日 1 月 2 火 3 水 4 木 5 金 6 土
  is_open     smallint not null default 0 check (is_open in (0,1)),   -- 1：その曜日は面談を受け付ける
  start_time  time     not null default '13:00',                        -- 受付の開始
  end_time    time     not null default '17:00',                        -- 受付の終了（この時刻の開始枠までは入らない）
  slot_min    smallint not null default 30 check (slot_min between 10 and 240),   -- 1回の面談の長さ（分）
  delete_flag smallint not null default 0 check (delete_flag in (0,1)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_time > start_time)
);

insert into interview_hours_master (weekday, is_open, start_time, end_time, slot_min) values
  (0,0,'13:00','17:00',30),
  (1,1,'13:00','17:00',30),
  (2,1,'13:00','17:00',30),
  (3,1,'13:00','17:00',30),
  (4,1,'13:00','17:00',30),
  (5,1,'13:00','17:00',30),
  (6,0,'13:00','17:00',30)
on conflict (weekday) do nothing;

create or replace trigger interview_hours_master_updated_at
  before update on interview_hours_master
  for each row execute function v2_set_updated_at();

grant select, insert, update on interview_hours_master to anon, authenticated;
revoke delete, truncate on interview_hours_master from anon, authenticated;
alter table interview_hours_master enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='interview_hours_master' and policyname='v2_select') then
    create policy v2_select on interview_hours_master for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='interview_hours_master' and policyname='v2_insert') then
    create policy v2_insert on interview_hours_master for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='interview_hours_master' and policyname='v2_update') then
    create policy v2_update on interview_hours_master for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
