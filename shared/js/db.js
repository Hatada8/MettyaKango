/* データベース（Supabase REST）の読み書き。全テーブル共通で使います。
   ・行は消さない設計なので「削除」は delete_flag を 1 にする softDelete を使います。
   ・select は何も指定しなければ delete_flag = 0 の行だけを返します。 */
const db = {
  async request(path, options = {}){
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: Object.assign({
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }, options.headers || {})
    });
    if(!res.ok){
      let body = '';
      try{ body = await res.text(); }catch(e){}
      const err = new Error(`${res.status} ${body}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  /* 読む。query は "select=*&order=..." のような PostgREST の書き方 */
  select(table, query = '', { includeDeleted = false } = {}){
    const parts = [];
    if(query) parts.push(query);
    if(!includeDeleted) parts.push('delete_flag=eq.0');
    return this.request(`${table}?${parts.join('&')}`);
  },

  /* 追加。追加した行を返します */
  insert(table, rows){
    return this.request(table, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
    });
  },

  /* 更新。filter は "patient_id=eq.1" のような条件 */
  update(table, filter, patch){
    return this.request(`${table}?${filter}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch)
    });
  },

  /* あれば更新、なければ追加。onConflict は一意になる列名（"employee_id,patient_id" など） */
  upsert(table, rows, onConflict){
    return this.request(`${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
    });
  },

  /* 削除（行は残して delete_flag を 1 にする） */
  softDelete(table, filter){
    return this.update(table, filter, { delete_flag: 1 });
  },

  /* 削除の取り消し */
  restore(table, filter){
    return this.update(table, filter, { delete_flag: 0 });
  }
};

/* 一意制約に引っかかったエラーかどうか（同じデータがすでにある） */
function isDuplicateError(e){
  return e && (e.status === 409 || String(e.body || '').includes('23505'));
}
