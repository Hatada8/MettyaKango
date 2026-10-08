# めっちゃかんご v2

v1 と同じ Supabase のデータベースを使い、新しいテーブル（v2 専用）だけで動く作り直し版です。
v1 のテーブルには書き込みません。データ設計は [docs/doa.md](docs/doa.md) にあります。

## はじめに（1 回だけ）

1. Supabase の **SQL Editor** に [db/schema.sql](db/schema.sql) を貼り付けて「Run」する
   （v2 のテーブル作成と初期データ。何回実行しても大丈夫です）
2. `v2/index.html`（または `v2/login/index.html`）をブラウザで開く

## フォルダ構成

```
v2/
├ index.html              ← 最初に開くファイル（ログイン画面へ移動）
├ docs/doa.md             ← データ設計（DOA）
├ db/schema.sql           ← テーブル作成と初期データ
├ login/                  ← ログイン画面（職員／ご家族）
│  └ js/ login.js（ログイン） / demo-login.js（デモ用かんたんログイン・あとで消す）
├ staff/                  ← 職員画面
│  ├ index.html           ← 患者一覧（お気に入りが上に固定）
│  ├ patient.html         ← 患者詳細
│  └ js/ list.js（一覧） / patient-form.js（患者の登録・修正）
│        detail-main.js（起動） / detail-profile.js（プロフィール・状態・管理者の操作）
│        detail-ai.js（AI要約） / detail-memos.js（申し送り・プライベートメモ）
│        detail-chat.js（ご家族とのチャット）
├ admin/                  ← 管理画面（管理者だけ）
│  └ js/ employees.js（職員） / masters.js（マスタ・権限） / patients.js（患者さん） / main.js
├ family/                 ← ご家族の画面
│  └ js/ main.js（様子・まとめ・お知らせ） / chat.js（メッセージ）
└ shared/                 ← 全画面で共通
   ├ css/base.css         ← 色・文字・部品
   └ js/
      ├ config.js         ← Supabase の接続先
      ├ db.js             ← データベースの読み書き（全テーブル共通）
      ├ session.js        ← ログイン情報・権限チェック
      ├ hash.js           ← パスワードの変換（SHA-256）
      ├ utils.js          ← 日付・年齢などの小さな関数
      ├ ui/               ← ヘッダー・ポップアップ・チャット表示
      └ api/              ← テーブルごとの読み書き（DOA のデータごとに 1 ファイル）
           master.js / employee.js / patient.js / symptom.js / memo.js
           ai-summary.js / favorite.js / family.js / chat.js
```

## デモ用ログイン

ログイン画面下の「デモ用かんたんログイン」から入れます。
消すときは `login/index.html` の「デモ用」の部分と `login/js/demo-login.js` を削除してください。

| 種類 | 入力するもの | パスワード |
|---|---|---|
| 管理者 | 職員番号 10001 | admin |
| 看護師（一般） | 職員番号 10002 / 10003 | 1234 |
| 医師（一般） | 職員番号 20001〜20004 | 1234 |
| ご家族 | 患者ID 100001 ＋ tanaka.family@example.com | 1234 |

ご家族は、新しいメールアドレスで入るとその場で登録されます。

## 権限

`permission_master` の `can_〇〇` 列で決まります（管理画面の「マスタ」→「権限」で切り替えられます）。

- 管理者：患者の新規登録・修正・削除、職員の管理、マスタの編集
- 一般：閲覧、メモの追加、状態の変更、AI 要約、お気に入り、チャット

バイタルは使わないことになったので、画面から外しました（`vital_sign` テーブルとデータは残しています）。

## AI 要約について

今は何回でも作り直せます（同じ入院の要約を新しい文章で上書き）。
「1回の入院につき1回だけ」に戻すときは、`shared/js/api/ai-summary.js` の `AI_SUMMARY_ONCE` を `true` にします。

今は外部の AI につながず、記録をひな形に沿ってまとめる「デモ」です。
本物の AI に替えるときは `shared/js/api/ai-summary.js` の `generateAiSummaryText` の中身だけを差し替えます。
（API キーをブラウザに置くと誰でも見られてしまうため、Supabase Edge Functions などのサーバー側から呼ぶ形がおすすめです）

## 本番で使う前に

- 今は公開キー（anon key）でそのまま読み書きしているため、権限の制限は画面の中だけのものです。
  `db/schema.sql` で RLS（行ごとのアクセス制限）は有効にしてあるので、Supabase Auth を入れてルール（policy）を絞れば、画面のコードを変えずに守りを固められます。
- パスワードは SHA-256 で変換して保存しています。v1 よりは安全ですが、本番では Supabase Auth に置き換えてください。
