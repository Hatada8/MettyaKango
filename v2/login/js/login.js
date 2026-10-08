/* ログイン画面：職員ログイン・家族ログイン */
let loginRole = 'staff';

function setLoginRole(role){
  loginRole = role;
  $('tabStaff').classList.toggle('active', role === 'staff');
  $('tabFamily').classList.toggle('active', role === 'family');
  $('staffForm').classList.toggle('hidden', role !== 'staff');
  $('familyForm').classList.toggle('hidden', role !== 'family');
}

/* 職員：職員番号＋パスワード */
async function loginStaff(employeeNo, password){
  if(!/^\d+$/.test(employeeNo)){ toast('職員番号は数字で入力してください'); return; }
  if(!password){ toast('パスワードを入力してください'); return; }
  try{
    const emp = await findEmployeeByNo(employeeNo);
    if(!emp){ toast('職員番号が見つかりません'); return; }
    if(emp.password_hash !== await sha256Hex(password)){ toast('パスワードが違います'); return; }
    goTo('../staff/index.html', buildStaffSession(emp));
  }catch(e){
    showError(e, 'ログインできませんでした。通信状態を確認してください');
  }
}

/* 家族：患者ID＋メールアドレス＋パスワード（初めてならその場で登録） */
async function loginFamily(patientNo, email, password){
  if(!/^\d+$/.test(patientNo)){ toast('患者IDは数字で入力してください'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ toast('メールアドレスを確認してください'); return; }
  if(password.length < 4){ toast('パスワードは4文字以上で入力してください'); return; }
  try{
    const result = await familyLogin(patientNo, email, password);
    if(result.error === 'patient'){ toast('該当する患者IDが見つかりません'); return; }
    if(result.error === 'password'){ toast('パスワードが違います'); return; }
    if(result.error === 'disabled'){ toast('このアカウントは利用できません。病院にお問い合わせください'); return; }
    if(result.created) toast('登録しました');
    goTo('../family/index.html', buildFamilySession(result.family, result.patient));
  }catch(e){
    showError(e, 'ログインできませんでした。通信状態を確認してください');
  }
}

$('staffForm').addEventListener('submit', e => {
  e.preventDefault();
  loginStaff($('staffNo').value.trim(), $('staffPassword').value);
});

$('familyForm').addEventListener('submit', e => {
  e.preventDefault();
  loginFamily($('familyPatientNo').value.trim(), $('familyEmail').value.trim(), $('familyPassword').value);
});
