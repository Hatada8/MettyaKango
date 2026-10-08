/* ---------------- ログイン画面の背景スライドショー ---------------- */
/* 実際の写真を使う場合は、下の配列にファイルパスやURLを入れてください。
   例）const LOGIN_PHOTOS = ['../img/nurse1.jpg', '../img/nurse2.jpg'];（ログイン画面から見た位置で書きます）
   空のままだと、看護師と患者さんのイラストが自動で表示されます。 */
const LOGIN_PHOTOS = ['../img/images.jpg', '../img/images (1).jpg', '../img/images (2).jpg', '../img/35053833_m.jpg'];
const LOGIN_SLIDE_MS = 6500;

function loginPerson(cx, by, s, o){
  o = Object.assign({ skin:'#F3CFAE', hair:'#3B2C26', cloth:'#2F6F62', cap:false, legs:true, legc:'#3A4663' }, o);
  const hy = by - 335*s;
  let g = '';
  if(o.legs){
    g += `<rect x="${cx-54*s}" y="${by-130*s}" width="${46*s}" height="${130*s}" rx="${14*s}" fill="${o.legc}"/>`;
    g += `<rect x="${cx+8*s}" y="${by-130*s}" width="${46*s}" height="${130*s}" rx="${14*s}" fill="${o.legc}"/>`;
    g += `<ellipse cx="${cx-30*s}" cy="${by}" rx="${34*s}" ry="${12*s}" fill="#2B2B33"/>`;
    g += `<ellipse cx="${cx+32*s}" cy="${by}" rx="${34*s}" ry="${12*s}" fill="#2B2B33"/>`;
  }
  const th = o.legs ? 175*s : 270*s;
  g += `<rect x="${cx-72*s}" y="${by-(o.legs?305:270)*s}" width="${144*s}" height="${th+ (o.legs?0:0)}" rx="${46*s}" fill="${o.cloth}"/>`;
  g += `<rect x="${cx-14*s}" y="${hy+40*s}" width="${28*s}" height="${40*s}" fill="${o.skin}"/>`;
  g += `<path d="M${cx-24*s} ${by-(o.legs?305:270)*s} L${cx} ${by-(o.legs?270:235)*s} L${cx+24*s} ${by-(o.legs?305:270)*s}Z" fill="#fff" opacity=".9"/>`;
  g += `<circle cx="${cx}" cy="${hy-6*s}" r="${50*s}" fill="${o.hair}"/>`;
  g += `<circle cx="${cx}" cy="${hy+6*s}" r="${44*s}" fill="${o.skin}"/>`;
  g += `<circle cx="${cx-16*s}" cy="${hy+6*s}" r="${4.5*s}" fill="#3a2a22"/><circle cx="${cx+16*s}" cy="${hy+6*s}" r="${4.5*s}" fill="#3a2a22"/>`;
  g += `<path d="M${cx-14*s} ${hy+24*s} q${14*s} ${14*s} ${28*s} 0" stroke="#B9654F" stroke-width="${4*s}" fill="none" stroke-linecap="round"/>`;
  g += `<circle cx="${cx-28*s}" cy="${hy+20*s}" r="${8*s}" fill="#F0A58F" opacity=".45"/><circle cx="${cx+28*s}" cy="${hy+20*s}" r="${8*s}" fill="#F0A58F" opacity=".45"/>`;
  if(o.cap){
    g += `<rect x="${cx-42*s}" y="${hy-66*s}" width="${84*s}" height="${28*s}" rx="${8*s}" fill="#fff" stroke="#D3DDDA" stroke-width="${2*s}"/>`;
    g += `<rect x="${cx-3*s}" y="${hy-61*s}" width="${6*s}" height="${18*s}" fill="#D9695A"/><rect x="${cx-9*s}" y="${hy-55*s}" width="${18*s}" height="${6*s}" fill="#D9695A"/>`;
  }
  return g;
}
function loginArm(x1,y1,x2,y2,w,cloth,skin){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cloth}" stroke-width="${w}" stroke-linecap="round"/>` +
         `<circle cx="${x2}" cy="${y2}" r="${w*0.5}" fill="${skin}"/>`;
}
function loginRoom(wall1, wall2, floor, extra){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall1}"/><stop offset="1" stop-color="${wall2}"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#w)"/><rect y="760" width="1600" height="140" fill="${floor}"/>
  ${extra}</svg>`;
}
function loginWindow(x,y,w,h){
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#CFE8F2"/><circle cx="${x+w*0.72}" cy="${y+h*0.3}" r="42" fill="#FFF3C4"/>` +
         `<rect x="${x}" y="${y+h*0.72}" width="${w}" height="${h*0.28}" fill="#BFE0C4"/>` +
         `<rect x="${x+w/2-4}" y="${y}" width="8" height="${h}" fill="#fff"/><rect x="${x}" y="${y+h/2-4}" width="${w}" height="8" fill="#fff"/>` +
         `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="#fff" stroke-width="12"/>`;
}
function buildLoginScenes(){
  const NC='#2F6F62', PJ='#9DB5D9', PJ2='#E9B8A8', SK='#F3CFAE', SK2='#E8BC96';
  // 1. ベッドサイドで手を握る
  const s1 = loginRoom('#F5F1EA','#E6EEEA','#D9D2C4',
    loginWindow(180,120,420,330) +
    `<rect x="760" y="420" width="64" height="360" rx="10" fill="#B58D6A"/><rect x="760" y="600" width="780" height="150" rx="16" fill="#F7F7F5"/>` +
    `<rect x="1040" y="360" width="240" height="190" rx="50" fill="#fff"/>` +
    loginPerson(1160,640,1.2,{cloth:PJ,hair:'#E6E6E6',legs:false,skin:SK2}) +
    `<rect x="880" y="610" width="660" height="150" rx="22" fill="#8FB8C9"/><rect x="880" y="610" width="660" height="26" rx="12" fill="#A9CCDA"/>` +
    loginPerson(600,820,1.4,{cloth:NC,cap:true,hair:'#2E2420'}) +
    loginArm(1100,420,925,622,36,PJ,SK2) + loginArm(690,500,918,620,38,NC,SK));
  // 2. 血圧測定
  const s2 = loginRoom('#EEF4F2','#DCE9E5','#D4D9D0',
    loginWindow(1050,110,380,300) +
    `<rect x="1280" y="560" width="220" height="30" rx="8" fill="#B58D6A"/><rect x="1300" y="590" width="16" height="170" fill="#B58D6A"/><rect x="1460" y="590" width="16" height="170" fill="#B58D6A"/>` +
    `<rect x="1330" y="500" width="120" height="60" rx="10" fill="#fff" stroke="#BFD0CB" stroke-width="4"/><rect x="1346" y="514" width="60" height="30" rx="4" fill="#9EDBC4"/>` +
    `<rect x="560" y="360" width="30" height="420" rx="8" fill="#C9D4D0" opacity="0"/>` +
    `<rect x="840" y="400" width="300" height="360" rx="40" fill="#C97B6B"/>` +
    loginPerson(990,720,1.25,{cloth:PJ2,hair:'#D8D8D8',legs:false,skin:SK2}) +
    `<rect x="860" y="640" width="260" height="130" rx="30" fill="#B5675A"/>` +
    loginPerson(480,820,1.4,{cloth:NC,cap:true,hair:'#5A3B2A'}) +
    loginArm(1040,470,780,560,36,PJ2,SK2) + `<rect x="740" y="528" width="60" height="64" rx="10" fill="#E39B55" transform="rotate(-8 770 560)"/>` +
    loginArm(570,500,762,560,38,NC,SK) +
    `<g transform="rotate(-6 640 560)"><rect x="600" y="520" width="90" height="120" rx="8" fill="#fff" stroke="#BFD0CB" stroke-width="4"/><rect x="618" y="548" width="54" height="6" fill="#B8C7C2"/><rect x="618" y="570" width="54" height="6" fill="#B8C7C2"/><rect x="618" y="592" width="38" height="6" fill="#B8C7C2"/></g>`);
  // 3. 廊下を一緒に歩く
  const s3 = loginRoom('#F4F0E8','#E5E9E2','#CFCFC4',
    `<rect x="120" y="190" width="200" height="570" rx="10" fill="#DCE6E2"/><rect x="150" y="220" width="140" height="520" fill="#EAF1EE"/>` +
    `<rect x="1300" y="190" width="200" height="570" rx="10" fill="#DCE6E2"/><rect x="1330" y="220" width="140" height="520" fill="#EAF1EE"/>` +
    loginWindow(620,180,360,260) +
    `<rect x="0" y="560" width="1600" height="16" rx="8" fill="#B58D6A"/>` +
    loginPerson(1090,830,1.3,{cloth:'#C6D6A8',hair:'#E4E4E4',skin:SK2,legc:'#6B7A9A'}) +
    loginPerson(690,830,1.4,{cloth:NC,cap:true,hair:'#2E2420'}) +
    loginArm(1146,520,1210,600,34,'#C6D6A8',SK2) + `<line x1="1210" y1="600" x2="1210" y2="830" stroke="#7B5B3D" stroke-width="12" stroke-linecap="round"/>` +
    loginArm(760,520,1034,560,36,NC,SK));
  // 4. 窓辺でお茶
  const s4 = loginRoom('#FBF3E6','#EFE6D6','#D8C9B0',
    loginWindow(500,90,600,380) +
    `<rect x="300" y="640" width="1000" height="34" rx="12" fill="#B58D6A"/><rect x="360" y="674" width="22" height="100" fill="#9C7656"/><rect x="1220" y="674" width="22" height="100" fill="#9C7656"/>` +
    loginPerson(560,760,1.3,{cloth:NC,cap:true,hair:'#5A3B2A',legs:false}) +
    loginPerson(1060,760,1.3,{cloth:PJ2,hair:'#E4E4E4',skin:SK2,legs:false}) +
    `<rect x="300" y="640" width="1000" height="34" rx="12" fill="#B58D6A"/>` +
    `<ellipse cx="800" cy="632" rx="46" ry="10" fill="#fff"/><rect x="760" y="590" width="80" height="44" rx="10" fill="#F6E4DF"/>` +
    loginArm(640,530,740,632,36,NC,SK) + loginArm(990,520,870,632,36,PJ2,SK2) +
    `<circle cx="1230" cy="610" r="30" fill="#7FB38C"/><circle cx="1260" cy="590" r="24" fill="#6BA57A"/><rect x="1215" y="620" width="40" height="22" rx="6" fill="#C97B6B"/>`);
  return [s1,s2,s3,s4].map(svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}

async function initLoginSlideshow(){
  const wrap = document.getElementById('loginBg');
  const dotsWrap = document.getElementById('loginDots');
  if(!wrap) return;
  let sources = [];
  if(LOGIN_PHOTOS.length){
    // 実際に読み込めた写真だけを使う（名前違い・場所違いの画像は飛ばす）
    const results = await Promise.all(LOGIN_PHOTOS.map(src => new Promise(res => {
      const im = new Image();
      im.onload = () => res({ src, ok:true });
      im.onerror = () => res({ src, ok:false });
      im.src = src;
      setTimeout(() => res({ src, ok:true }), 4000); // 読み込みが長引くときは待たずに進める
    })));
    sources = results.filter(r => r.ok).map(r => r.src);
    const bad = results.filter(r => !r.ok).map(r => r.src);
    if(bad.length){
      console.warn('読み込めない画像:', bad);
      showToast('読み込めない画像があります：' + bad[0] + (bad.length > 1 ? ` ほか${bad.length-1}枚` : ''));
    }
  }
  if(!sources.length) sources = buildLoginScenes();
  sources.forEach((src, i) => {
    const d = document.createElement('div');
    d.className = 'slide' + (i===0 ? ' on' : '');
    d.style.backgroundImage = `url("${src}")`;
    wrap.appendChild(d);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dot' + (i===0 ? ' on' : '');
    b.setAttribute('aria-label', `${i+1}枚目の画像を表示`);
    b.onclick = () => { show(i); restart(); };
    dotsWrap.appendChild(b);
  });
  const slides = wrap.querySelectorAll('.slide');
  const dots = dotsWrap.querySelectorAll('.dot');
  let cur = 0, timer = null;
  function show(i){
    slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
    cur = (i + slides.length) % slides.length;
    slides[cur].classList.add('on'); dots[cur].classList.add('on');
  }
  function restart(){
    clearInterval(timer);
    timer = setInterval(() => {
      if(document.getElementById('screen-login').classList.contains('active') && !document.hidden) show(cur+1);
    }, LOGIN_SLIDE_MS);
  }
  restart();
}
document.addEventListener('DOMContentLoaded', initLoginSlideshow);
