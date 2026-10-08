-- AI要約に「もとの自由記述」を一緒に保存する列を足します（文字数の比較用）。
-- Supabase の SQL Editor で1回実行してください（何回実行しても大丈夫です）。
alter table patient_ai_summary add column if not exists source_text text;
