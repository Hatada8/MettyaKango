/* キャッシュ対策：HTML が読み込む JS・CSS の URL に「?v=バージョン」を付ける（付いていれば書き換える）
   ブラウザは URL が変わると新しいファイルを読み直すので、更新したあとも古い画面が出る問題を防げます。

   使い方（プッシュする前に実行する）：
     node scripts/bump-version.js            … 今の日時（日本時間）をバージョンにする
     node scripts/bump-version.js 1.2.3      … 好きなバージョンにする */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['.git', '.github', 'node_modules', 'v2', 'scripts']);

const version = process.argv[2] || (() => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
})();

function* htmlFiles(dir){
  for(const e of fs.readdirSync(dir, { withFileTypes: true })){
    if(e.isDirectory()){ if(!SKIP.has(e.name)) yield* htmlFiles(path.join(dir, e.name)); }
    else if(e.name.endsWith('.html')) yield path.join(dir, e.name);
  }
}

// src="…js" / href="…css" で、http や // で始まらないもの（自分のファイル）だけが対象
const re = /((?:src|href)=")((?!https?:|\/\/|data:|#)[^"?]+\.(?:js|css))(\?v=[^"]*)?(")/g;

let changed = 0;
for(const file of htmlFiles(root)){
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(re, (_, a, url, _old, q) => `${a}${url}?v=${version}${q}`);
  if(after !== before){ fs.writeFileSync(file, after); changed++; console.log('更新:', path.relative(root, file)); }
}
console.log(`バージョン ${version} を ${changed} ファイルに反映しました`);
