/* データ：看護師・家族アカウント（簡易パスワード認証） */
/* ---------------- accounts（簡易パスワード認証） ---------------- */
async function getNurseAccounts(){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/nurse_accounts`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ name:r.name, password:r.password }));
    }catch(e){ console.error(e); return []; }
  }
  return loadList('accounts_nurse');
}
async function addNurseAccount(account){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/nurse_accounts`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{ name: account.name, password: account.password }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('アカウント登録に失敗しました'); return false; }
  }
  const list = await loadList('accounts_nurse');
  list.push(account);
  return saveList('accounts_nurse', list);
}

async function getFamilyAccounts(){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/family_accounts`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ name:r.name, password:r.password, patientCode:r.patient_code }));
    }catch(e){ console.error(e); return []; }
  }
  return loadList('accounts_family');
}
async function addFamilyAccount(account){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/family_accounts`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{ name: account.name, password: account.password, patient_code: account.patientCode }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('アカウント登録に失敗しました'); return false; }
  }
  const list = await loadList('accounts_family');
  list.push(account);
  return saveList('accounts_family', list);
}
