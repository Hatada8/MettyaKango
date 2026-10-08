# めっちゃかんご

ログイン画面・看護師用・家族用・管理用を、フォルダごとに分けた Web アプリです。
見た目は v1 のまま、中身（データと機能）は v2 と同じです。
v2 と同じ Supabase のテーブル（`employee_master` / `patient_master` など）を使います。
データ設計は [v2/docs/doa.md](v2/docs/doa.md)、テーブルの作り方は [v2/db/schema.sql](v2/db/schema.sql) にあります。

## フォルダ構成

```
mecchakango/
├ index.html            ← 最初に開くファイル（ログイン画面へ移動します）
├ login/                ← ログイン画面（職員：病院コード＋職員番号＋パスワード／ご家族：患者ID＋メール＋パスワード）
│  └ js/  login.js（ログイン） / demo-login.js（デモ用かんたんログイン・あとで消す） / slideshow.js（背景の写真）
├ nurse/                ← 看護師用（トップ：患者一覧＋プロフィール＋各ページへのボタン）
│  ├ index.html          ← 患者プロフィール ＋ 4 つのボタン
│  ├ ai-summary.html / handover.html / private-memo.html / messages.html  ← ボタンの先の各ページ
│  └ js/  main.js（起動） / state.js / patient-list.js（患者一覧・お気に入り）
│        patient-detail.js（プロフィール・4つのボタン・管理者の操作） / sub-page.js（各ページ共通の起動）
│        ai-summary.js（AI要約） / memos.js（申し送り・プライベートメモ） / chat.js（家族とのメッセージ）
├ family/               ← 家族用
│  └ js/  main.js（様子・病状のキーワード） / chat.js（メッセージ） / state.js
├ admin/                ← 管理用（管理者だけ）
│  └ js/  main.js / employees.js（職員） / masters.js（マスタ・権限） / patients.js（患者さん）
├ shared/               ← 全画面で共通
│  ├ css/ base.css（色・フォント） / components.css（カード・チャット・ポップアップ等）
│  └ js/  config.js（Supabase設定） / utils.js / session.js（ログイン情報・権限） / db.js / hash.js
│        api/（テーブルごとの読み書き。v2/shared/js/api と同じ内容）
│        ui/  modal.js（ポップアップ） / patient-form.js（患者の登録・修正）
├ img/                  ← ログイン画面の背景写真
└ v2/                   ← v2（別の見た目の作り直し版）
```

## できること

| 機能 | 誰が |
|---|---|
| 患者一覧・お気に入り（★で上に固定） | 職員みんな（お気に入りは職員ごと） |
| 申し送りメモ（ひとことで記録） | 職員みんな |
| プライベートメモ（趣味・好きなものなど） | 職員みんな |
| AI要約（自由記述を書いて要約。もとの文章と要約の文字数を比べられる。今は何回でも作り直せる・手直しできる） | 職員みんな |
| ご家族とのメッセージ | 職員・ご家族 |
| 面談の予約（ご家族がカレンダーで日時を選んで申込み → 職員が確定・取り消し・完了。職員が直接登録もできる） | ご家族・職員 |
| 未読の点（患者一覧の名前の右と、AI要約・メモ・メッセージの各カードの右。他の人が書いた記録を、自分がまだ見ていないとき） | 職員ごと |
| 病状のキーワード（診断名・既往歴をタップすると説明が出る。説明は管理画面の「マスタ」→「症状」で編集） | ご家族 |
| 患者の新規登録・修正・退院・削除、メモの削除 | 管理者だけ |
| 職員の管理・マスタ（分野・役割・症状・権限）の編集 | 管理者だけ |

バイタルはなくしました（`vital_sign` テーブルは消さずに残しています）。
面談予約は作り直しました（新しいテーブル `interview_appointment`。前の `appointments` テーブルは使わず、消さずに残しています）。使うには [v2/db/add_interview.sql](v2/db/add_interview.sql) を SQL Editor で1回実行してください。

AI要約を「1回の入院につき1回だけ」に戻すときは、`shared/js/api/ai-summary.js` の
`AI_SUMMARY_ONCE` を `true` にします（v2 は `v2/shared/js/api/ai-summary.js`）。

## はじめに（追加分）

未読の点と病状の説明を使うには、Supabase の SQL Editor で [v2/db/add_read_status_and_symptom_info.sql](v2/db/add_read_status_and_symptom_info.sql) を1回実行してください（何回実行しても大丈夫です。既存のテーブルは消しません）。
実行する前でも画面は動きますが、点は出ず、病状の説明は「まだ登録されていません」になります。
AI要約の「自由記述」を一緒に保存して文字数を比べるには、[v2/db/add_ai_source_text.sql](v2/db/add_ai_source_text.sql) も1回実行してください（実行前は、要約は作れますが、もとの文章は保存されません）。

## デモ用ログイン

ログイン画面の「デモ用かんたんログイン」から入れます。ログイン情報は [v2/README.md](v2/README.md) にあります。
消すときは `login/index.html` の「デモ用」の部分と `login/js/demo-login.js` を削除してください。

## 公開する前に

- 今は公開キー（anon key）でそのまま読み書きしているため、権限の制限は画面の中だけのものです。本番では Supabase Auth と RLS のルールで守ってください。
- AI要約は、自由記述から大事そうな文を選んで短くする「デモ」です。本物の AI に替えるときは `shared/js/api/ai-summary.js` の `generateAiSummaryText` を差し替えます。
