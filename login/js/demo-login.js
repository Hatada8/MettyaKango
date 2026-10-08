/* ▼▼▼ デモ用のかんたんログイン（あとで消す）▼▼▼
   消すときは、このファイルと login/index.html の「デモ用」の div・script を削除してください。
   ここに書いているのは、v2/db/schema.sql で入れた初期データのログイン情報です。 */
const DEMO_ACCOUNTS = {
  admin:  { kind: 'staff',  employeeNo: '10001', password: 'admin' },
  nurse:  { kind: 'staff',  employeeNo: '10002', password: '1234' },
  family: { kind: 'family', patientNo: '100001', email: 'tanaka.family@example.com', password: '1234' }
};

function demoLogin(key){
  const a = DEMO_ACCOUNTS[key];
  if(a.kind === 'staff') loginStaff(a.employeeNo, a.password);
  else loginFamily(a.patientNo, a.email, a.password);
}
/* ▲▲▲ デモ用ここまで ▲▲▲ */
