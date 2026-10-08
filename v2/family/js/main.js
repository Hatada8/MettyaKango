/* 家族画面：患者さんの様子・看護師からのまとめ・お知らせ */
const LEVEL_MESSAGE = {
  1: '♡ 落ち着いて過ごされています',
  2: '♡ 看護師が様子を見守っています',
  3: '♡ 注意してしっかり見守っています'
};

async function loadFamilyPage(){
  const pid = session.patientId;
  try{
    const [detail, summary, notices] = await Promise.all([
      getPatientDetail(pid),
      getFamilyAiSummary(pid),
      listMemos(pid, MEMO_TYPE.HANDOVER, { familyOnly: true, limit: 20 })
    ]);
    if(!detail){
      $('hero').innerHTML = '<p class="empty">患者さんの情報が見つかりません。病院にお問い合わせください。</p>';
      return;
    }
    renderHero(detail);
    renderStats(detail, notices[0]);
    renderSummary(summary);
    renderNotices(notices);
  }catch(e){
    showError(e, '読み込めませんでした');
  }
}

function renderHero({ patient: p, current }){
  const age = calcAge(p.birth_date);
  $('leadText').textContent = `${p.patient_name}さんの病院での様子をお届けします。`;
  $('hero').innerHTML = `
    <span class="avatar large ${avatarColor(p.patient_id)}">${esc(initialOf(p.patient_name))}</span>
    <div>
      <small class="muted">ご入院中のご家族</small>
      <h2>${esc(p.patient_name)} 様</h2>
      <p class="muted">${age != null ? `${age}歳・` : ''}${esc(masterName('sex', p.sex_id))}${current && current.room_no ? `　${esc(current.room_no)}号室` : ''}</p>
      ${current
        ? `<span class="badge lv${current.condition_level_id}">${LEVEL_MESSAGE[current.condition_level_id] || ''}</span>`
        : '<span class="badge gray">退院されました</span>'}
    </div>
    <span class="flower" aria-hidden="true">✿</span>`;
}

function renderStats({ current }, latestNotice){
  const card = (icon, label, value) => `<div class="panel"><span>${icon}</span><small>${label}</small><b>${esc(value)}</b></div>`;
  $('familyStats').innerHTML = [
    card('♥', '体調', current ? masterName('conditionLevel', current.condition_level_id) : '—'),
    card('⌂', '病室', current && current.room_no ? `${current.room_no}号室` : '—'),
    card('☾', '入院', current ? `${dayOfStay(current.admitted_on)}日目` : '—'),
    card('✎', '最新のお知らせ', latestNotice ? fmtDateTime(latestNotice.created_at) : 'まだありません')
  ].join('');
}

function renderSummary(summary){
  if(!summary){ $('summaryPanel').classList.add('hidden'); return; }
  $('summaryPanel').classList.remove('hidden');
  $('summaryText').textContent = aiSummaryText(summary);
  $('summaryMeta').textContent = `${fmtDateTime(summary.edited_text ? summary.updated_at : summary.generated_at, true)} 更新`;
}

function renderNotices(notices){
  $('noticeList').innerHTML = notices.length
    ? notices.map(m => `
        <div class="entry">
          <div class="entry-head"><b>${esc(m.employee_master ? m.employee_master.employee_name : '看護師')}</b><span>${fmtDateTime(m.created_at, true)}</span></div>
          <p class="entry-body">${esc(m.content)}</p>
        </div>`).join('')
    : '<p class="empty">まだお知らせはありません。</p>';
}

document.addEventListener('DOMContentLoaded', async () => {
  if(!requireFamily()) return;
  renderHeader({ subtitle: 'ご家族のページ' });
  $('todayChip').textContent = `今日　${new Date().toLocaleDateString('ja-JP', { timeZone: TZ, month: 'long', day: 'numeric', weekday: 'short' })}`;
  try{ await loadMasters(); }catch(e){ showError(e); }
  setupFamilyChat();
  await Promise.all([loadFamilyPage(), loadFamilyChat()]);
});
