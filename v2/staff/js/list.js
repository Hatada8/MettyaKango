/* 職員画面：患者一覧（お気に入りを上に固定） */
let admitted = [];          // 入院中の患者（admission ＋ patient_master）
let favoriteIds = new Set();
let unreadCounts = {};
let listFilter = 'all';

function greetingText(){
  const h = Number(new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }));
  if(h >= 5 && h < 11) return 'おはようございます';
  if(h >= 11 && h < 18) return 'こんにちは';
  return 'おつかれさまです';
}

function renderStats(){
  $('statTotal').textContent = admitted.length;
  $('statAlert').textContent = admitted.filter(a => a.condition_level_id === 3).length;
  $('statWatch').textContent = admitted.filter(a => a.condition_level_id === 2).length;
  $('statUnread').textContent = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
}

function patientRowHtml(a){
  const p = a.patient_master;
  const fav = favoriteIds.has(p.patient_id);
  const age = calcAge(p.birth_date);
  const unread = unreadCounts[p.patient_id] || 0;
  const href = `patient.html?id=${p.patient_id}`;
  const meta = [
    age != null ? `${age}歳` : '', masterName('sex', p.sex_id),
    a.room_no ? `${a.room_no}号室` : '', masterName('department', a.department_id)
  ].filter(Boolean).join('・');
  return `
    <div class="patient-row">
      <button type="button" class="star ${fav ? 'on' : ''}" aria-pressed="${fav}"
        aria-label="${fav ? 'お気に入りから外す' : 'お気に入りに登録'}" onclick="toggleFavorite(${p.patient_id})">${fav ? '★' : '☆'}</button>
      <a class="patient" href="${href}" onclick="event.preventDefault(); goTo('${href}')">
        <span class="avatar ${avatarColor(p.patient_id)}">${esc(initialOf(p.patient_name))}</span>
        <span class="patient-info">
          <b>${esc(p.patient_name)} 様</b>
          <small>${esc(meta)}</small>
          ${a.care_note ? `<small class="note">${esc(a.care_note)}</small>` : ''}
        </span>
        <span class="patient-badges">
          ${unread ? `<em class="badge chat">💬 ${unread}</em>` : ''}
          <em class="badge lv${a.condition_level_id}">${esc(masterName('conditionLevel', a.condition_level_id))}</em>
        </span>
        <strong aria-hidden="true">›</strong>
      </a>
    </div>`;
}

function renderList(){
  const word = $('search').value.trim().toLowerCase();
  let rows = admitted.filter(a => {
    const p = a.patient_master;
    if(listFilter === 'favorite' && !favoriteIds.has(p.patient_id)) return false;
    if(listFilter === 'alert' && a.condition_level_id !== 3) return false;
    if(!word) return true;
    return [p.patient_name, p.patient_kana, a.room_no, p.patient_no].some(v => String(v ?? '').toLowerCase().includes(word));
  });

  // 状態が重い順 → 部屋番号順
  rows.sort((x, y) => (y.condition_level_id - x.condition_level_id) || ((x.room_no || 0) - (y.room_no || 0)));
  const favs = rows.filter(a => favoriteIds.has(a.patient_master.patient_id));
  const others = rows.filter(a => !favoriteIds.has(a.patient_master.patient_id));

  if(!rows.length){
    $('patientList').innerHTML = '<p class="empty">該当する患者さんはいません。</p>';
    return;
  }
  let html = '';
  if(favs.length) html += `<div class="group-label">★ お気に入り（${favs.length}名）</div>` + favs.map(patientRowHtml).join('');
  if(others.length) html += `<div class="group-label">${favs.length ? 'そのほかの患者さん' : '患者さん'}（${others.length}名）</div>` + others.map(patientRowHtml).join('');
  $('patientList').innerHTML = html;
}

async function toggleFavorite(patientId){
  const on = !favoriteIds.has(patientId);
  try{
    await setFavorite(session.employeeId, patientId, on);
    if(on) favoriteIds.add(patientId); else favoriteIds.delete(patientId);
    renderList();
    toast(on ? 'お気に入りに登録しました' : 'お気に入りから外しました');
  }catch(e){ showError(e, 'お気に入りを保存できませんでした'); }
}

async function loadList(){
  try{
    [admitted, favoriteIds, unreadCounts] = await Promise.all([
      listAdmittedPatients(),
      listFavoritePatientIds(session.employeeId),
      unreadCountsForStaff()
    ]);
    renderStats();
    renderList();
  }catch(e){
    showError(e, '患者一覧を読み込めませんでした');
    $('patientList').innerHTML = '<p class="empty">読み込めませんでした。データベースの準備ができているか確認してください。</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if(!requireStaff()) return;
  renderHeader({ subtitle: '患者一覧', active: 'list' });
  $('greeting').textContent = `${greetingText()}、${session.name.split(/\s/)[0]}さん`;
  $('newPatientBtn').classList.toggle('hidden', !can('can_patient_create'));

  $('search').addEventListener('input', renderList);
  $('listFilter').addEventListener('click', e => {
    const btn = e.target.closest('button[data-filter]');
    if(!btn) return;
    listFilter = btn.dataset.filter;
    $('listFilter').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    renderList();
  });

  try{ await loadMasters(); }catch(e){ showError(e, 'マスタを読み込めませんでした'); }
  await loadList();
});
