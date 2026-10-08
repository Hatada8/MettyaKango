/* 看護師画面：患者一覧（サイドバー）・お気に入り */
async function loadPatientList(){
  try{
    [admitted, favoriteIds, unreadMap] = await Promise.all([
      listAdmittedPatients(),
      listFavoritePatientIds(session.employeeId),
      unreadByPatient(session.employeeId)
    ]);
  }catch(e){
    showError(e, '患者一覧を読み込めませんでした');
  }
  renderPatientList();
  if(currentPatientId && typeof renderPageMenu === 'function') renderPageMenu(); // 未読バッジを更新
}

function patientItemHtml(a){
  const p = a.patient_master;
  const fav = favoriteIds.has(p.patient_id);
  const age = calcAge(p.birth_date);
  const unread = hasUnread(unreadMap, p.patient_id);
  return `
    <div class="patient-item ${p.patient_id === currentPatientId ? 'active' : ''}" onclick="renderPatient(${p.patient_id})">
      <button type="button" class="fav-star ${fav ? 'on' : ''}" aria-pressed="${fav}"
        aria-label="${fav ? 'お気に入りから外す' : 'お気に入りに登録'}"
        onclick="event.stopPropagation(); toggleFavorite(${p.patient_id})">${fav ? '★' : '☆'}</button>
      <div class="avatar">${escapeHtml(String(p.patient_name || '？')[0])}</div>
      <div class="meta">
        <div class="name">${escapeHtml(p.patient_name)}</div>
        <div class="room">${escapeHtml(a.room_no ?? '—')}号室・${age != null ? escapeHtml(age) + '歳・' : ''}ID:${escapeHtml(p.patient_no)}</div>
      </div>
      ${unread ? `<span class="unread-dot" role="img" aria-label="未読があります" title="まだ見ていない記録があります"></span>` : ''}
    </div>`;
}

function renderPatientList(){
  const label = document.getElementById('patientCountLabel');
  if(label) label.textContent = `担当患者 ／ ${admitted.length}名`;

  const list = document.getElementById('patientList');
  const q = (document.getElementById('patientSearch')?.value || '').trim();
  const sexFilter = document.getElementById('patientSexFilter')?.value || '';

  let filtered = admitted.filter(a => {
    const p = a.patient_master;
    if(sexFilter && String(p.sex_id) !== sexFilter) return false;
    if(!q) return true;
    return [p.patient_name, p.patient_kana, a.room_no, p.patient_no].some(v => String(v ?? '').includes(q));
  });

  if(admitted.length === 0){
    list.innerHTML = `<div class="empty" style="padding:16px 8px;">入院中の患者さんはいません。</div>`;
    return;
  }
  if(filtered.length === 0){
    list.innerHTML = `<div class="empty" style="padding:16px 8px;">該当する患者が見つかりません</div>`;
    return;
  }

  // 状態が重い順 → 部屋番号順。お気に入りは上に固定
  filtered.sort((x, y) => (y.condition_level_id - x.condition_level_id) || ((x.room_no || 0) - (y.room_no || 0)));
  const favs = filtered.filter(a => favoriteIds.has(a.patient_master.patient_id));
  const others = filtered.filter(a => !favoriteIds.has(a.patient_master.patient_id));

  let html = '';
  if(favs.length) html += `<div class="list-group">★ お気に入り</div>` + favs.map(patientItemHtml).join('');
  if(others.length) html += (favs.length ? `<div class="list-group">そのほか</div>` : '') + others.map(patientItemHtml).join('');
  const wrap = document.getElementById('patientListWrap');
  const keepScroll = wrap ? wrap.scrollTop : 0; // 定期更新でスクロール位置が戻らないように
  list.innerHTML = html;
  limitListHeight();
  if(wrap) wrap.scrollTop = keepScroll;
}

/* 5人より多いときは、5人ぶんの高さで止めて、一覧の中だけスクロールさせる */
const LIST_VISIBLE_ROWS = 5;
function limitListHeight(){
  const wrap = document.getElementById('patientListWrap');
  if(!wrap) return;
  const items = wrap.querySelectorAll('.patient-item');
  if(items.length <= LIST_VISIBLE_ROWS){ wrap.style.maxHeight = ''; return; }
  const last = items[LIST_VISIBLE_ROWS - 1];
  const bottom = last.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top + wrap.scrollTop;
  wrap.style.maxHeight = Math.ceil(bottom + 4) + 'px';
}
window.addEventListener('resize', limitListHeight);

async function toggleFavorite(patientId){
  const on = !favoriteIds.has(patientId);
  try{
    await setFavorite(session.employeeId, patientId, on);
    if(on) favoriteIds.add(patientId); else favoriteIds.delete(patientId);
    renderPatientList();
    if(patientId === currentPatientId) renderProfile();
    showToast(on ? 'お気に入りに登録しました' : 'お気に入りから外しました');
  }catch(e){ showError(e, 'お気に入りを保存できませんでした'); }
}
