-- =========================================================
-- めっちゃかんご：病院マスタの追加
-- Supabase の SQL Editor に貼り付けて「Run」してください（何回実行しても大丈夫です）。
-- ・既存のテーブルは消しません。新しいテーブルを足し、職員・患者に「どの病院か」の列を足すだけです。
-- ・今いる職員・患者は、すべて最初の病院（hospital_id = 1）になります。
-- =========================================================

create table if not exists hospital_master (
  hospital_id   smallint primary key,
  hospital_code bigint   not null unique,      -- 病院コード（数字）
  hospital_name text     not null,
  sort_order    smallint not null default 0,
  delete_flag   smallint not null default 0 check (delete_flag in (0,1)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

insert into hospital_master (hospital_id, hospital_code, hospital_name, sort_order) values
  (1, 1001, 'めっちゃ総合病院', 1)
on conflict (hospital_id) do nothing;

alter table employee_master add column if not exists hospital_id smallint not null default 1 references hospital_master(hospital_id);
alter table patient_master  add column if not exists hospital_id smallint not null default 1 references hospital_master(hospital_id);

create or replace trigger hospital_master_updated_at
  before update on hospital_master
  for each row execute function v2_set_updated_at();

grant select, insert, update on hospital_master to anon, authenticated;
revoke delete, truncate on hospital_master from anon, authenticated;
alter table hospital_master enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hospital_master' and policyname='v2_select') then
    create policy v2_select on hospital_master for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hospital_master' and policyname='v2_insert') then
    create policy v2_insert on hospital_master for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hospital_master' and policyname='v2_update') then
    create policy v2_update on hospital_master for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
