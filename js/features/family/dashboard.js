/* ---------------- family: init & records ---------------- */
async function initFamilyScreen(){
  const id = currentFamilyPatient.id;
  await refreshAiSummary();
  await refreshChat();
  await refreshApptLog();
  const dateInput = document.getElementById('apptDate');
  if(dateInput){
    const today = todayISO();
    dateInput.min = today;
    if(!dateInput.value) dateInput.value = today;
  }
  await refreshApptTimeOptions();
  if(familyPollTimer) clearInterval(familyPollTimer);
  familyPollTimer = setInterval(async ()=>{
    await refreshAiSummary();
    await refreshChat();
    await refreshApptTimeOptions(); // 看護師が枠を増減したら自動で反映する
  }, 8000);
}

async function refreshAiSummary(){
  const box = document.getElementById('familyAiSummaryBox');
  if(!box || !currentFamilyPatient) return;
  const data = await getAiSummary(currentFamilyPatient.id);
  if(!data){
    box.innerHTML = `<span class="tag">AI要約・未生成</span>看護師が記録を要約すると、ここに最新の様子が表示されます。`;
    return;
  }
  const t = new Date(data.updatedAt);
  const tstr = isNaN(t) ? '' : `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}更新`;
  box.innerHTML = `<span class="tag">AI要約・本日 ${tstr}</span>${escapeHtml(data.summary)}`;
}
