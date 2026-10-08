/* 保存先の切り替え（Supabase を使わないとき用）
   Claude の window.storage があればそれを、なければブラウザの localStorage を使います。 */
function hasCloudStorage(){
  return typeof window !== 'undefined' && window.storage && typeof window.storage.get === 'function';
}
async function loadList(key){
  try{
    if(hasCloudStorage()){
      const res = await window.storage.get(key, true);
      return res ? JSON.parse(res.value) : [];
    }
    const raw = localStorage.getItem('mk:' + key);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}
async function saveList(key, arr){
  try{
    if(hasCloudStorage()){
      const res = await window.storage.set(key, JSON.stringify(arr), true);
      if(!res){ showToast('保存に失敗しました。もう一度お試しください'); return false; }
      return true;
    }
    localStorage.setItem('mk:' + key, JSON.stringify(arr));
    return true;
  }catch(e){
    showToast('保存に失敗しました。もう一度お試しください');
    return false;
  }
}
