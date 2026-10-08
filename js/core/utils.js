/* ---------------- 共通ユーティリティ ---------------- */
function nowTimeStr(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function typeText(el, full){
  let i = 0;
  const speed = 18;
  clearInterval(el._typeTimer);
  el._typeTimer = setInterval(()=>{
    i += 2;
    el.textContent = full.slice(0, i);
    if(i >= full.length){ clearInterval(el._typeTimer); }
  }, speed);
}
