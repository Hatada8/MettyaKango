/* 画面上部のヘッダー（ロゴ・メニュー・ログイン中の人） */
function renderHeader({ subtitle = '', active = '' } = {}){
  const header = $('appHeader');
  if(!header) return;

  const links = [];
  if(session && session.kind === 'staff'){
    links.push({ key: 'list', label: '患者一覧', href: '../staff/index.html' });
    if(canOpenAdmin()) links.push({ key: 'admin', label: '管理', href: '../admin/index.html' });
  }

  let who = '';
  if(session && session.kind === 'staff'){
    who = `<span class="who"><b>${esc(session.name)}</b><small>${esc(session.roleName)}・${esc(session.permissionName)}</small></span>`;
  }else if(session && session.kind === 'family'){
    who = `<span class="who"><b>ご家族</b><small>${esc(session.email)}</small></span>`;
  }

  header.className = 'header';
  header.innerHTML = `
    <a class="brand" href="${session && session.kind === 'staff' ? '../staff/index.html' : '#'}">
      <span class="brand-icon" aria-hidden="true">♡</span>
      <span><b>めっちゃかんご</b><small>${esc(subtitle)}</small></span>
    </a>
    ${links.length ? `<nav class="nav">${links.map(l =>
      `<a href="${l.href}" class="${l.key === active ? 'active' : ''}" onclick="event.preventDefault(); goTo('${l.href}')">${l.label}</a>`
    ).join('')}</nav>` : ''}
    <div class="header-right">
      ${who}
      ${session ? '<button type="button" class="light small" onclick="logout()">ログアウト</button>' : ''}
    </div>`;
}
