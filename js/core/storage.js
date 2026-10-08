/* =========================================================
   Supabase 連携設定
   ここに Supabase プロジェクトの URL と anon key を入れると、
   自動的に Supabase を使ったデータ保存に切り替わります。
   未設定のままなら、アプリ内蔵のクラウド保存(window.storage)で
   引き続き動作します（デモ・検証用）。
   ========================================================= */
const SUPABASE_URL = "https://jurpatzszdlrgyghyvog.supabase.co";        // 例: "https://xxxxxxxx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cnBhdHpzemRscmd5Z2h5dm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzg3ODIsImV4cCI6MjEwNDYxNDc4Mn0.8OBnLhBTXSLqszdXxUcFqX_B2IzWFSNzgypQ583huz8";   // Supabase の「anon / public」キー
const useSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function sbHeaders(extra){
  return Object.assign({
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  }, extra || {});
}

/* ---------------- window.storage 経由のフォールバック ---------------- */
async function loadList(key){
  try{
    const res = await window.storage.get(key, true);
    return res ? JSON.parse(res.value) : [];
  }catch(e){
    return [];
  }
}
async function saveList(key, arr){
  try{
    const res = await window.storage.set(key, JSON.stringify(arr), true);
    if(!res){ showToast('保存に失敗しました。もう一度お試しください'); return false; }
    return true;
  }catch(e){
    showToast('保存に失敗しました。もう一度お試しください');
    return false;
  }
}
