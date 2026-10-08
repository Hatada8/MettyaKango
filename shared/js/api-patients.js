/* データ：患者（デモ用の初期患者データも含む） */
/* ---------------- seed data（初回のみ投入するデモ患者） ---------------- */
const SEED_PATIENTS = [
  {
    id:1, name:"田中 花子", room:"305", age:82, sex:"女性",
    diag:"大腿骨頸部骨折・術後リハビリ", allergy:"ペニシリン系",
    admitted:"2026/07/20", flag:"mid",
    issues:["転倒リスク:中","リハビリ意欲:良好","食事量:やや低下"],
    rawNotes:"7/20入院。術後3日目。リハビリでは歩行器使用し病棟内1周歩行可能。食事は主食6〜8割摂取。夜間不眠の訴えあり、軽度の不安感。家族の面会を楽しみにしている様子。血圧・体温は安定。",
    aiSummary:"術後3日目、リハビリは順調に進行中（歩行器で病棟内1周可）。食事摂取はやや低下傾向のため経過観察が必要。夜間は軽度の不眠と不安感の訴えあり、精神的なケアと家族との面会機会の確保が有効と考えられる。バイタルは安定。",
    familyCode:"IIZ0001"
  },
  {
    id:2, name:"山本 大輔", room:"212", age:56, sex:"男性",
    diag:"2型糖尿病・血糖コントロール目的入院", allergy:"なし",
    admitted:"2026/07/28", flag:"low",
    issues:["血糖管理:安定","服薬指導:実施中"],
    rawNotes:"食事療法と運動療法を並行して実施中。血糖値は入院時より改善傾向。インスリン自己注射の手技を確認、概ね自立して実施可能。退院後の生活指導が今後の課題。",
    aiSummary:"血糖コントロールは入院時より改善傾向にあり、インスリン自己注射手技もほぼ自立。今後は退院後の生活・食事指導の定着が課題であり、栄養士との連携継続を推奨。",
    familyCode:"IIZ0002"
  },
  {
    id:3, name:"佐々木 美咲", room:"118", age:34, sex:"女性",
    diag:"虫垂炎術後", allergy:"なし",
    admitted:"2026/08/03", flag:"low",
    issues:["術後経過:良好","疼痛管理中"],
    rawNotes:"術後2日目。創部の状態良好、感染兆候なし。疼痛はNRS2〜3程度でコントロール良好。明日より食事再開予定。",
    aiSummary:"術後経過は良好で創部感染の兆候なし。疼痛も鎮痛薬でコントロールできており、明日からの食事再開に向け問題ない状態。",
    familyCode:"IIZ0003"
  },
  {
    id:4, name:"高橋 勇", room:"402", age:74, sex:"男性",
    diag:"誤嚥性肺炎", allergy:"造影剤",
    admitted:"2026/08/01", flag:"high",
    issues:["嚥下機能:要注意","発熱あり","家族への説明:未実施"],
    rawNotes:"発熱38.2℃継続。嚥下評価の結果、とろみ食への変更が必要。呼吸状態はやや努力様。家族への病状説明が未実施のため、明日の面談を調整中。",
    aiSummary:"発熱が継続しており呼吸状態にもやや努力様がみられるため注意深い観察が必要。嚥下機能低下によりとろみ食への変更を実施済み。家族への病状説明が未実施のため、早急な面談調整を推奨する。",
    familyCode:"IIZ0004"
  }
];

let patients = [];
let patientsLoaded = false;

/* ---------------- patients ---------------- */
async function getPatients(silent){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?order=id.asc`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({
        id:r.id, name:r.name, room:r.room, age:r.age, sex:r.sex, diag:r.diag, allergy:r.allergy,
        admitted:r.admitted, flag:r.flag, issues:r.issues||[], rawNotes:r.raw_notes||'', aiSummary:r.ai_summary||'',
        familyCode:r.family_code
      }));
    }catch(e){ console.error(e); if(!silent) showToast('Supabaseからの読み込みに失敗しました'); return []; }
  }
  return loadList('patients_list');
}
async function createPatient(p){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{
          id:p.id, name:p.name, room:p.room, age:p.age, sex:p.sex, diag:p.diag, allergy:p.allergy,
          admitted:p.admitted, flag:p.flag, issues:p.issues, raw_notes:p.rawNotes, ai_summary:p.aiSummary,
          family_code:p.familyCode
        }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('Supabaseへの保存に失敗しました'); return false; }
  }
  const list = await loadList('patients_list');
  list.push(p);
  return saveList('patients_list', list);
}

async function updatePatient(p){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${p.id}`, {
        method: "PATCH",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify({ issues: p.issues })
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('保存に失敗しました'); return false; }
  }
  const list = await loadList('patients_list');
  const idx = list.findIndex(x => x.id === p.id);
  if(idx >= 0){ list[idx] = p; } else { list.push(p); }
  return saveList('patients_list', list);
}

function generateFamilyCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do{
    code = 'IIZ' + Array.from({length:4}, ()=> chars[Math.floor(Math.random()*chars.length)]).join('');
  } while(patients.some(p=>p.familyCode===code));
  return code;
}

async function ensurePatientsLoaded(){
  if(patientsLoaded) return;
  let list = await getPatients();
  if(list.length === 0){
    for(const p of SEED_PATIENTS){ await createPatient(p); }
    list = SEED_PATIENTS.slice();
  }
  patients = list;
  patientsLoaded = true;
}
