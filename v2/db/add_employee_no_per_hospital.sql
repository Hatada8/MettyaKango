-- =========================================================
-- めっちゃかんご：職員番号を「病院ごと」に付けられるようにする
-- Supabase の SQL Editor に貼り付けて「Run」してください（何回実行しても大丈夫です）。
-- ・これまで：職員番号は全体で1つだけ（別の病院でも同じ番号は使えなかった）
-- ・これから：同じ病院の中でだけ重複しない（病院が違えば同じ番号を使える）
-- ・テーブルやデータは消しません。重複の制限（制約）だけを付け替えます。
-- ・先に add_hospital_master.sql を実行しておいてください。
-- =========================================================

do $$
declare
  c text;
begin
  -- 「employee_no だけ」を一意にしている古い制約を外す
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'employee_master'::regclass
       and con.contype = 'u'
       and array(select a.attname from pg_attribute a
                  where a.attrelid = con.conrelid and a.attnum = any(con.conkey)) = array['employee_no']::name[]
  loop
    execute format('alter table employee_master drop constraint %I', c);
  end loop;

  -- 「病院 ＋ 職員番号」で一意にする
  if not exists (select 1 from pg_constraint where conname = 'employee_master_hospital_no_key') then
    alter table employee_master
      add constraint employee_master_hospital_no_key unique (hospital_id, employee_no);
  end if;
end $$;
