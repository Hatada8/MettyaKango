/* ログイン画面：職員ログイン・家族ログイン
   職員：職員番号＋パスワード（アカウントは管理者が登録）
   家族：患者ID＋メールアドレス＋パスワード（初めてのメールアドレスならその場で登録） */
let loginRole = 'staff';

function setLoginRole(role){
  loginRole = role;
  document.getElementById('tabStaff').classList.toggle('active', role === 'staff');
  document.getElementById('tabFamily').classList.toggle('active', role === 'family');
  document.getElementById('staffFields').style.display = role === 'staff' ? 'block' : 'none';
  document.getElementById('familyFields').style.display = role === 'family' ? 'block' : 'none';
  document.getElementById('loginNote').textContent = role === 'staff'
    ? '職員のアカウントは管理者が登録します。'
    : '初めての方は、入力したメールアドレスとパスワードでそのまま登録されます。';
}

/* カードを押したとき：そのカードの役割でログイン */
function handleAuth(role){
  if(role !== loginRole) setLoginRole(role);
  const password = document.getElementById('loginPassword').value;
  if(role === 'family'){
    loginFamily(document.getElementById('loginPatientNo').value.trim(), document.getElementById('loginEmail').value.trim(), password);
  }else{
    loginStaff(document.getElementById('loginStaffNo').value.trim(), password);
  }
}

async function loginStaff(employeeNo, password){
  if(!/^\d+$/.test(employeeNo)){ showToast('職員番号を数字で入力してください'); return; }
  if(!password){ showToast('パスワードを入力してください'); return; }
  try{
    const emp = await findEmployeeByNo(employeeNo);
    if(!emp){ showToast('職員番号が見つかりません'); return; }
    if(emp.password_hash !== await sha256Hex(password)){ showToast('パスワードが違います'); return; }
    goTo('../nurse/index.html', buildStaffSession(emp));
  }catch(e){
    showError(e, 'ログインできませんでした。通信状態を確認してください');
  }
}

async function loginFamily(patientNo, email, password){
  if(!/^\d+$/.test(patientNo)){ showToast('患者IDを数字で入力してください'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('メールアドレスを確認してください'); return; }
  if(password.length < 4){ showToast('パスワードは4文字以上で入力してください'); return; }
  try{
    const result = await familyLogin(patientNo, email, password);
    if(result.error === 'patient'){ showToast('該当する患者IDが見つかりません。IDをご確認ください'); return; }
    if(result.error === 'password'){ showToast('パスワードが違います'); return; }
    if(result.error === 'disabled'){ showToast('このアカウントは利用できません。病院にお問い合わせください'); return; }
    if(result.created) showToast('登録しました');
    goTo('../family/index.html', buildFamilySession(result.family, result.patient));
  }catch(e){
    showError(e, 'ログインできませんでした。通信状態を確認してください');
  }
}
