/* ログイン情報の受け渡し（ログイン画面 → 看護師画面／家族画面／管理画面）
   職員：{ kind:'staff', employeeId, employeeNo, name, roleId, roleName, permissionId, permissionName, perms }
   家族：{ kind:'family', familyId, patientId, patientNo, email }
   perms には permission_master の can_〇〇 の列がそのまま入ります。
   ブラウザの localStorage に保存し、保存できない環境でも動くよう URL の #s= でも渡します。 */
const SESSION_KEY = 'mecchakango_session';
const LOGIN_PAGE = '../login/index.html';
let session = null;

function saveSession(s){
  try{ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }catch(e){}
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
}
function loadSession(){
  // 1) URL の #s=... から（保存できない環境向け）
  if(location.hash.startsWith('#s=')){
    try{
      const s = JSON.parse(decodeURIComponent(location.hash.slice(3)));
      saveSession(s);
      history.replaceState(null, '', location.pathname + location.search);
      return s;
    }catch(e){}
  }
  // 2) 保存済みのログイン情報から
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

/* ページを移動する（ログイン情報も一緒に渡す） */
function goTo(path, s = session){
  if(s) saveSession(s);
  location.href = s ? `${path}#s=${encodeURIComponent(JSON.stringify(s))}` : path;
}

/* 職員としてログインしているか確認。違えばログイン画面へ戻す */
function requireStaff(){
  const s = loadSession();
  if(!s || s.kind !== 'staff'){ location.replace(LOGIN_PAGE); return null; }
  session = s;
  return s;
}

/* 家族としてログインしているか確認 */
function requireFamily(){
  const s = loadSession();
  if(!s || s.kind !== 'family'){ location.replace(LOGIN_PAGE); return null; }
  session = s;
  return s;
}

/* 権限があるか（例：can('can_patient_create')） */
function can(flag){
  return !!(session && session.perms && Number(session.perms[flag]) === 1);
}

/* 管理画面に入れるか（管理の権限がどれか 1 つでもあれば） */
function canOpenAdmin(){
  return can('can_employee_manage') || can('can_master_manage') || can('can_patient_delete');
}

function logout(){
  clearSession();
  session = null;
  location.href = LOGIN_PAGE;
}
