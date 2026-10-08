/* 家族画面：面談の予約
   ・カレンダーで日付を選ぶ → 空いている時間を選ぶ → 種類とひとことを入れて申し込む
   ・申し込んだ予約は、職員が確定すると「確定」になる。ご家族は取り消せる
   ・退院後は新しい予約はできない */
let ivYear = Number(todayISO().slice(0, 4));
let ivMonth = Number(todayISO().slice(5, 7));
let ivSelected = null;      // 選んだ日
let ivTime = null;          // 選んだ時間
let ivBooked = new Set();   // 表示中の月で、すでに埋まっている時間（"YYYY-MM-DD HH:MM"）
let ivMine = [];            // このご家族の患者さんの予約

/* 受け付ける日：明日以降の平日 */
function ivIsDisabled(date){
  if(date <= todayISO()) return true;
  const w = calWeekday(date);
  return w === 0 || w === 6;
}

function ivFreeTimes(date){
  return interviewTimes().filter(t => !ivBooked.has(`${date} ${t}`));
}

async function refreshInterviews(){
  const card = document.getElementById('interviewCard');
  if(!card) return;
  // 入力中は、自動更新で入力欄を作り直さない
  const panel = document.getElementById('interviewPanel');
  if(panel && panel.contains(document.activeElement) && document.activeElement !== panel) return;
  try{
    const range = calMonthRange(ivYear, ivMonth);
    [ivBooked, ivMine] = await Promise.all([
      bookedInterviewSlots(range.from, range.to),
      listInterviews({ patientId: session.patientId, includeCancelled: true })
    ]);
    ivMine.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    renderInterviews();
  }catch(e){
    console.warn('面談予約を読み込めませんでした', e);
    card.classList.add('hidden');   // テーブルがまだない（SQL 未実行）ときは出さない
  }
}

function ivCanBook(){
  return !familyDetail || !!familyDetail.current;   // 退院後は予約できない
}

function renderInterviews(){
  const open = ivCanBook();
  document.getElementById('interviewClosedNote').classList.toggle('hidden', open);
  document.getElementById('interviewBooking').classList.toggle('hidden', !open);

  if(open){
    const mineByDate = {};
    ivMine.filter(m => m.interview_status_id !== INTERVIEW_STATUS.CANCELLED)
      .forEach(m => { (mineByDate[interviewDate(m.start_at)] = mineByDate[interviewDate(m.start_at)] || []).push(m); });

    document.getElementById('interviewCalendar').innerHTML = calendarHtml({
      year: ivYear, month: ivMonth, selected: ivSelected,
      isDisabled: ivIsDisabled,
      selectFn: 'selectInterviewDay', monthFn: 'moveInterviewMonth',
      cellHtml: date => {
        const mine = mineByDate[date] || [];
        if(mine.length) return mine.map(m => `<span class="cal-chip mine">${interviewTime(m.start_at)} ご予約</span>`).join('');
        if(ivIsDisabled(date)) return '';
        const free = ivFreeTimes(date).length;
        return free ? `<span class="cal-free">空き${free}</span>` : `<span class="cal-free">満席</span>`;
      }
    });
    renderInterviewPanel();
  }
  renderMyInterviews();
}

function renderInterviewPanel(){
  const box = document.getElementById('interviewPanel');
  if(!ivSelected){ box.classList.add('hidden'); box.innerHTML = ''; return; }
  const free = ivFreeTimes(ivSelected);
  if(ivTime && !free.includes(ivTime)) ivTime = null;
  const d = ivSelected.split('-').map(Number);
  const prevType = document.getElementById('ivType') ? document.getElementById('ivType').value : '';
  const prevNote = document.getElementById('ivNote') ? document.getElementById('ivNote').value : '';
  box.classList.remove('hidden');
  box.innerHTML = `
    <h4>${d[1]}月${d[2]}日（${['日', '月', '火', '水', '木', '金', '土'][calWeekday(ivSelected)]}）の空き時間</h4>
    ${free.length ? '' : '<p class="muted">この日は満席です。ほかの日をお選びください。</p>'}
    <div class="iv-times">
      ${interviewTimes().map(t => `
        <button type="button" class="iv-time ${t === ivTime ? 'on' : ''}" ${free.includes(t) ? '' : 'disabled'}
          onclick="chooseInterviewTime('${t}')">${t}</button>`).join('')}
    </div>
    <div class="iv-form">
      <label><span class="iv-label">面談の内容</span>
        <select id="ivType">${masterOptions('interviewType', prevType || 1)}</select></label>
      <label><span class="iv-label">ひとこと（聞きたいこと・ご希望など）</span>
        <textarea id="ivNote" rows="2" placeholder="例：今後の見通しについて伺いたいです">${escapeHtml(prevNote)}</textarea></label>
      <button type="button" class="chat-send" style="height:44px;" onclick="submitInterview()" ${ivTime ? '' : 'disabled'}>
        ${ivTime ? `${d[1]}月${d[2]}日 ${ivTime} で申し込む` : '時間を選んでください'}</button>
    </div>`;
}

function renderMyInterviews(){
  const box = document.getElementById('myInterviews');
  const now = Date.now();
  const list = ivMine.filter(m => m.interview_status_id !== INTERVIEW_STATUS.CANCELLED || new Date(m.start_at) > now).slice(0, 8);
  if(!list.length){ box.innerHTML = '<p class="muted">まだ予約はありません。</p>'; return; }
  box.innerHTML = `<div class="iv-list">${list.map(m => {
    const future = new Date(m.start_at) > now;
    const canCancel = future && [INTERVIEW_STATUS.REQUESTED, INTERVIEW_STATUS.CONFIRMED].includes(m.interview_status_id);
    return `
      <div class="iv-item">
        <span class="when">${fmtDate(interviewDate(m.start_at))} ${interviewTime(m.start_at)}</span>
        <span class="iv-badge s${m.interview_status_id}">${escapeHtml(masterName('interviewStatus', m.interview_status_id))}</span>
        <span class="what">${escapeHtml(masterName('interviewType', m.interview_type_id))}${m.note ? '／' + escapeHtml(m.note) : ''}</span>
        ${canCancel ? `<span class="acts"><button type="button" class="iv-small-btn danger" onclick="cancelMyInterview(${m.interview_id})">取り消す</button></span>` : ''}
      </div>`;
  }).join('')}</div>`;
}

function selectInterviewDay(date){
  ivSelected = (ivSelected === date) ? null : date;
  ivTime = null;
  renderInterviews();
}

async function moveInterviewMonth(delta){
  if(delta === 0){ ivYear = Number(todayISO().slice(0, 4)); ivMonth = Number(todayISO().slice(5, 7)); }
  else{ const m = calShiftMonth(ivYear, ivMonth, delta); ivYear = m.year; ivMonth = m.month; }
  ivSelected = null; ivTime = null;
  await refreshInterviews();
}

function chooseInterviewTime(t){
  ivTime = (ivTime === t) ? null : t;
  renderInterviewPanel();
}

async function submitInterview(){
  if(!ivCanBook()){ showToast('退院されたため、予約はできません'); return; }
  if(!ivSelected || !ivTime){ showToast('日付と時間を選んでください'); return; }
  try{
    const result = await createInterview({
      patientId: session.patientId,
      familyId: session.familyId,
      typeId: Number(document.getElementById('ivType').value),
      dateISO: ivSelected, time: ivTime,
      note: document.getElementById('ivNote').value
    });
    if(result.already){
      showToast('その時間は、ほかの方が先に予約されました。別の時間をお選びください');
    }else{
      showToast('面談を申し込みました。病棟が確認して、確定をお知らせします');
      ivTime = null;
    }
    await refreshInterviews();
  }catch(e){ showError(e, '申し込めませんでした'); }
}

async function cancelMyInterview(interviewId){
  if(!confirm('この面談予約を取り消します。よろしいですか？')) return;
  try{
    await setInterviewStatus(interviewId, INTERVIEW_STATUS.CANCELLED);
    showToast('取り消しました');
    await refreshInterviews();
  }catch(e){ showError(e, '取り消せませんでした'); }
}
