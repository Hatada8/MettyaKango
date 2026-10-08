/* マスタの読み込み
   どのマスタも「〇〇_id」「〇〇_name」「sort_order」という同じ形なので、
   MASTER_DEFS に 1 行足すだけで新しいマスタを扱えます。 */
const MASTER_DEFS = {
  sex:            { table: 'sex_master',             id: 'sex_id',             name: 'sex_name',             label: '性別' },
  symptomType:    { table: 'symptom_type_master',    id: 'symptom_type_id',    name: 'symptom_type_name',    label: '症状の種別' },
  conditionLevel: { table: 'condition_level_master', id: 'condition_level_id', name: 'condition_level_name', label: '患者の状態' },
  memoType:       { table: 'memo_type_master',       id: 'memo_type_id',       name: 'memo_type_name',       label: 'メモの種別' },
  role:           { table: 'role_master',            id: 'role_id',            name: 'role_name',            label: '役割' },
  permission:     { table: 'permission_master',      id: 'permission_id',      name: 'permission_name',      label: '権限' },
  department:     { table: 'department_master',      id: 'department_id',      name: 'department_name',      label: '分野' },
  symptom:        { table: 'symptom_master',         id: 'symptom_id',         name: 'symptom_name',         label: '症状' },
  // optional：add_hospital_master.sql を実行する前でも、ほかの画面が止まらないようにする
  hospital:       { table: 'hospital_master',        id: 'hospital_id',        name: 'hospital_name',        label: '病院', optional: true }
};

/* よく使う番号（区分マスタの値） */
const SYMPTOM_TYPE = { DIAGNOSIS: 1, ALLERGY: 2, HISTORY: 3 };
const MEMO_TYPE = { HANDOVER: 1, PRIVATE: 2 };
const ROLE = { DOCTOR: 1 };

const masters = {};

/* すべてのマスタをまとめて読み込む */
async function loadMasters(){
  const keys = Object.keys(MASTER_DEFS);
  const lists = await Promise.all(keys.map(k =>
    db.select(MASTER_DEFS[k].table, 'order=sort_order,' + MASTER_DEFS[k].id)
      .catch(e => { if(MASTER_DEFS[k].optional) return []; throw e; })));
  keys.forEach((k, i) => { masters[k] = lists[i]; });
  return masters;
}

/* 番号から名前を引く（例：masterName('sex', 2) → '女性'） */
function masterName(key, id){
  const def = MASTER_DEFS[key];
  const row = (masters[key] || []).find(r => Number(r[def.id]) === Number(id));
  return row ? row[def.name] : '';
}

/* <select> の <option> を作る */
function masterOptions(key, selectedId, { filter, blank } = {}){
  const def = MASTER_DEFS[key];
  let rows = masters[key] || [];
  if(filter) rows = rows.filter(filter);
  const head = blank ? `<option value="">${esc(blank)}</option>` : '';
  return head + rows.map(r =>
    `<option value="${r[def.id]}" ${Number(r[def.id]) === Number(selectedId) ? 'selected' : ''}>${esc(r[def.name])}</option>`
  ).join('');
}

/* ---- マスタの編集（管理画面用） ---- */
async function listMasterRows(key){
  const def = MASTER_DEFS[key];
  return db.select(def.table, 'order=sort_order,' + def.id);
}

async function addMasterRow(key, name, extra = {}){
  const def = MASTER_DEFS[key];
  const row = Object.assign({ [def.name]: name }, extra);
  // symptom_master は番号が自動。それ以外は「今の最大＋1」を使う
  if(key !== 'symptom'){
    const all = await db.select(def.table, `select=${def.id}&order=${def.id}.desc&limit=1`, { includeDeleted: true });
    row[def.id] = all.length ? Number(all[0][def.id]) + 1 : 1;
  }
  const maxSort = await db.select(def.table, `select=sort_order&order=sort_order.desc&limit=1`, { includeDeleted: true });
  row.sort_order = maxSort.length ? Number(maxSort[0].sort_order) + 1 : 1;
  return db.insert(def.table, row);
}

async function updateMasterRow(key, id, patch){
  const def = MASTER_DEFS[key];
  return db.update(def.table, `${def.id}=eq.${id}`, patch);
}

async function deleteMasterRow(key, id){
  const def = MASTER_DEFS[key];
  return db.softDelete(def.table, `${def.id}=eq.${id}`);
}
