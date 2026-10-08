/* ▼▼▼ デモ用のかんたんログイン（あとで消す）▼▼▼
   消すときは、このファイルと login/index.html の「デモ用」の div・script を削除してください。
   プルダウンの中身はデータベースから作ります（職員は全員、ご家族は患者さんごとに 1 件）。
   職員は、病院コードも自動で入れてログインします。
   デモ用のパスワード：10001（管理者）は admin、それ以外はすべて 1234。
   ご家族のメールアドレス：患者ID 100001 は tanaka.family@example.com、それ以外は family＜患者ID＞@example.com */
function demoPassword(employeeNo){
  return String(employeeNo) === '10001' ? 'admin' : '1234';
}
function demoFamilyEmail(patientNo){
  return String(patientNo) === '100001' ? 'tanaka.family@example.com' : `family${patientNo}@example.com`;
}

/* プルダウンの値 'staff:10002' / 'family:100003' からログインする */
/* 職員の病院コードを調べてからログインする */
async function demoStaffLogin(no){
  try{
    const emp = await findEmployeeByNo(no);
    const hospitals = emp ? await db.select('hospital_master', `hospital_id=eq.${emp.hospital_id}`) : [];
    if(!hospitals.length){ showToast('職員の病院が見つかりません'); return; }
    loginStaff(no, demoPassword(no), String(hospitals[0].hospital_code));
  }catch(e){ showError(e, 'ログインできませんでした'); }
}

function demoLogin(key){
  const [kind, no] = String(key).split(':');
  if(kind === 'staff') demoStaffLogin(no);
  else if(kind === 'family') loginFamily(no, demoFamilyEmail(no), '1234');
  // 古い呼び方（admin / nurse / family）も使えるようにしておく
  else if(key === 'admin') demoStaffLogin('10001');
  else if(key === 'nurse') demoStaffLogin('10002');
  else if(key === 'family') loginFamily('100001', demoFamilyEmail('100001'), '1234');
}

async function initDemoLogin(){
  const select = document.getElementById('demoSelect');
  if(!select) return;
  try{
    const [staff, patients] = await Promise.all([
      db.select('employee_master', 'select=employee_no,employee_name,role_master(role_name),permission_master(permission_name)&order=employee_no'),
      db.select('patient_master', 'select=patient_no,patient_name&order=patient_no')
    ]);
    select.innerHTML = `
      <option value="">アカウントを選ぶ…</option>
      <optgroup label="職員">
        ${staff.map(s => `<option value="staff:${s.employee_no}">${esc(s.employee_name)}（${esc(s.role_master ? s.role_master.role_name : '')}${s.permission_master ? '・' + esc(s.permission_master.permission_name) : ''}）</option>`).join('')}
      </optgroup>
      <optgroup label="ご家族">
        ${patients.map(p => `<option value="family:${p.patient_no}">${esc(p.patient_name)} さんのご家族</option>`).join('')}
      </optgroup>`;
  }catch(e){
    select.innerHTML = '<option value="">読み込めませんでした</option>';
  }
}
function demoLoginSelected(){
  const v = document.getElementById('demoSelect').value;
  if(!v){ showToast('アカウントを選んでください'); return; }
  demoLogin(v);
}
document.addEventListener('DOMContentLoaded', initDemoLogin);
/* ▲▲▲ デモ用ここまで ▲▲▲ */
