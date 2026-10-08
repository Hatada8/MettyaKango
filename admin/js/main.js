/* 管理画面：起動とタブの切り替え（権限があるタブだけ出す） */
function showTab(name){
  document.querySelectorAll('#adminTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  ['employees', 'masters', 'patients'].forEach(t => $('tab-' + t).classList.toggle('hidden', t !== name));
  if(name === 'employees') loadEmployees();
  if(name === 'masters') loadMasterEditors();
  if(name === 'patients') loadAdminPatients();
}

document.addEventListener('DOMContentLoaded', async () => {
  if(!requireStaff()) return;
  $('adminWelcome').textContent = `${session.name} さん（${session.permissionName}）としてログイン中`;

  const tabs = [...document.querySelectorAll('#adminTabs button')];
  tabs.forEach(b => {
    b.classList.toggle('hidden', !can(b.dataset.perm));
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });
  const first = tabs.find(b => can(b.dataset.perm));
  if(!first){
    $('adminTabs').classList.add('hidden');
    $('noPermission').classList.remove('hidden');
    return;
  }

  try{ await loadMasters(); }catch(e){ showError(e, 'マスタを読み込めませんでした'); return; }
  showTab(first.dataset.tab);
});
