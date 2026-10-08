/* ---------------- navigation / auth ---------------- */
function setAuthMode(mode){
  authMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode==='login');
  document.getElementById('tabSignup').classList.toggle('active', mode==='signup');
  document.getElementById('confirmPasswordWrap').style.display = mode==='signup' ? 'block' : 'none';
  document.getElementById('nurseEnterLabel').textContent = mode==='signup' ? '看護師として新規登録　→' : '看護師としてログイン　→';
  document.getElementById('familyEnterLabel').textContent = mode==='signup' ? '家族として新規登録　→' : '家族としてログイン　→';
}

function handleAuth(role){
  if(authMode === 'signup') return doSignup(role);
  return doLogin(role);
}

async function doLogin(role){
  const name = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!name){ showToast('お名前を入力してください'); return; }
  if(!password){ showToast('パスワードを入力してください'); return; }

  await ensurePatientsLoaded();

  if(role === 'family'){
    const code = document.getElementById('loginPatientId').value.trim().toUpperCase();
    if(!code){ showToast('患者IDを入力してください（看護師から伝えられたID）'); return; }
    const found = patients.find(p => p.familyCode === code);
    if(!found){ showToast('該当する患者IDが見つかりません。IDをご確認ください'); return; }

    const accounts = await getFamilyAccounts();
    const existing = accounts.find(a => a.name === name && a.patientCode === code);
    if(!existing){ showToast('アカウントが見つかりません。「新規登録」から登録してください'); return; }
    if(existing.password !== password){ showToast('パスワードが違います'); return; }

    enterFamilyScreen(name, found);
  } else {
    const accounts = await getNurseAccounts();
    const existing = accounts.find(a => a.name === name);
    if(!existing){ showToast('アカウントが見つかりません。「新規登録」から登録してください'); return; }
    if(existing.password !== password){ showToast('パスワードが違います'); return; }

    enterNurseScreen(name);
  }
}

async function doSignup(role){
  const name = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;
  const confirm = document.getElementById('loginPasswordConfirm').value;
  if(!name){ showToast('お名前を入力してください'); return; }
  if(!password){ showToast('パスワードを入力してください'); return; }
  if(password !== confirm){ showToast('パスワード（確認）が一致しません'); return; }

  await ensurePatientsLoaded();

  if(role === 'family'){
    const code = document.getElementById('loginPatientId').value.trim().toUpperCase();
    if(!code){ showToast('患者IDを入力してください（看護師から伝えられたID）'); return; }
    const found = patients.find(p => p.familyCode === code);
    if(!found){ showToast('該当する患者IDが見つかりません。IDをご確認ください'); return; }

    const accounts = await getFamilyAccounts();
    const existing = accounts.find(a => a.name === name && a.patientCode === code);
    if(existing){ showToast('このお名前・患者IDはすでに登録されています。「ログイン」からお入りください'); return; }

    const ok = await addFamilyAccount({ name, password, patientCode: code });
    if(!ok) return;
    showToast('新規登録が完了しました');

    enterFamilyScreen(name, found);
  } else {
    const accounts = await getNurseAccounts();
    const existing = accounts.find(a => a.name === name);
    if(existing){ showToast('このお名前はすでに登録されています。「ログイン」からお入りください'); return; }

    const ok = await addNurseAccount({ name, password });
    if(!ok) return;
    showToast('新規登録が完了しました');
    enterNurseScreen(name);
  }
}


function enterFamilyScreen(name, found){
  currentUser = { name, role:'family' };
  currentFamilyPatient = found;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('familyWelcome').textContent = `${name} さんとしてログイン中`;
  document.getElementById('screen-family').classList.add('active');
  document.getElementById('familyPatientName').textContent = `${found.name} さん（${found.age}歳）`;
  document.getElementById('familyPatientMeta').textContent = `${found.room}号室に入院中／診断名：${found.diag}`;
  initFamilyScreen();
}

async function enterNurseScreen(name){
  currentUser = { name, role:'nurse' };
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('nurseWelcome').textContent = `${name} さんとしてログイン中`;
  document.getElementById('screen-nurse').classList.add('active');
  if(patients.length > 0) currentPatientId = patients[0].id;
  const schedDate = document.getElementById('scheduleDateInput');
  if(schedDate){
    schedDate.min = todayISO();
    if(!schedDate.value) schedDate.value = todayISO();
  }
  await refreshAppointmentsIndex();
  renderPatientList();
  renderScheduleTimetable(true);
  if(currentPatientId) renderPatient(currentPatientId);
  if(nurseListPollTimer) clearInterval(nurseListPollTimer);
  nurseListPollTimer = setInterval(async ()=>{
    const latest = await getPatients(true);
    if(latest.length) patients = latest;
    await refreshAppointmentsIndex();
    renderPatientList();
    renderScheduleTimetable(false);
  }, 10000);
}

function logout(){
  currentUser = null;
  currentFamilyPatient = null;
  if(familyPollTimer){ clearInterval(familyPollTimer); familyPollTimer = null; }
  if(nursePollTimer){ clearInterval(nursePollTimer); nursePollTimer = null; }
  if(nurseListPollTimer){ clearInterval(nurseListPollTimer); nurseListPollTimer = null; }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('loginName').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginPasswordConfirm').value = '';
  document.getElementById('loginPatientId').value = '';
  setAuthMode('login');
}
