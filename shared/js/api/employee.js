/* 職員（employee_master） */
const EMPLOYEE_SELECT = 'select=*,role_master(role_name),permission_master(*),department_master(department_name)';

async function findEmployeeByNo(employeeNo){
  const rows = await db.select('employee_master', `${EMPLOYEE_SELECT}&employee_no=eq.${Number(employeeNo)}`);
  return rows[0] || null;
}

async function listEmployees({ includeDeleted = false } = {}){
  return db.select('employee_master', `${EMPLOYEE_SELECT}&order=sort_order,employee_no`, { includeDeleted });
}

/* 医師だけ（主治医の選択肢） */
async function listDoctors(){
  return db.select('employee_master', `select=employee_id,employee_name,employee_kana,department_id&role_id=eq.${ROLE.DOCTOR}&order=employee_no`);
}

async function createEmployee({ employeeNo, name, kana, password, roleId, permissionId, departmentId, hospitalId }){
  return db.insert('employee_master', {
    ...(hospitalId ? { hospital_id: Number(hospitalId) } : {}),
    employee_no: Number(employeeNo),
    employee_name: name,
    employee_kana: kana || null,
    password_hash: await sha256Hex(password),
    role_id: Number(roleId),
    permission_id: Number(permissionId),
    department_id: departmentId ? Number(departmentId) : null
  });
}

/* password を渡したときだけパスワードも変える */
async function updateEmployee(employeeId, { name, kana, password, roleId, permissionId, departmentId, hospitalId }){
  const patch = {
    ...(hospitalId ? { hospital_id: Number(hospitalId) } : {}),
    employee_name: name,
    employee_kana: kana || null,
    role_id: Number(roleId),
    permission_id: Number(permissionId),
    department_id: departmentId ? Number(departmentId) : null
  };
  if(password) patch.password_hash = await sha256Hex(password);
  return db.update('employee_master', `employee_id=eq.${employeeId}`, patch);
}

async function deleteEmployee(employeeId){
  return db.softDelete('employee_master', `employee_id=eq.${employeeId}`);
}

async function restoreEmployee(employeeId){
  return db.restore('employee_master', `employee_id=eq.${employeeId}`);
}

/* ログイン後に持ち回る情報を作る */
function buildStaffSession(emp){
  const perms = {};
  const p = emp.permission_master || {};
  Object.keys(p).filter(k => k.startsWith('can_')).forEach(k => { perms[k] = Number(p[k]); });
  return {
    kind: 'staff',
    employeeId: emp.employee_id,
    employeeNo: emp.employee_no,
    name: emp.employee_name,
    roleId: emp.role_id,
    roleName: (emp.role_master && emp.role_master.role_name) || '',
    permissionId: emp.permission_id,
    permissionName: p.permission_name || '',
    perms
  };
}
