/* 酸鹼實驗室 — 互動邏輯（無外部相依） */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';

  // 化學式排版：H2SO4 → 下標；SO4^2- → 上標
  function chem(s) {
    return s
      .replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>')
      .replace(/\^(\d*)([+-])/g, (_, n, sg) => '<sup>' + n + (sg === '-' ? '−' : '+') + '</sup>');
  }
  // 以 10 的次方顯示濃度
  function pow10(e) { return e === 0 ? '1 M' : '10<sup>' + (e < 0 ? '−' + (-e) : e) + '</sup> M'; }

  /* ---------- 進度儲存 ---------- */
  const KEY = 'acidbase-lab-v1';
  let state = { done: {}, best: null };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* 無法使用儲存時照常運作 */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 略 */ } }

  const stations = $$('.station').map(s => ({ n: +s.dataset.n, title: s.dataset.title, el: s }));

  function renderNav() {
    $('#map').innerHTML = stations.map(s =>
      `<li class="${state.done[s.n] ? 'ok' : ''}"><a href="#s${s.n}"><b>0${s.n}</b><span>${s.title}</span></a></li>`).join('');
    $('#rail').innerHTML = stations.map(s =>
      `<a href="#s${s.n}" data-r="${s.n}" class="${state.done[s.n] ? 'ok' : ''}"><b>0${s.n}</b>${s.title}</a>`).join('');
    const c = stations.filter(s => state.done[s.n]).length;
    $('#progText').textContent = c + ' / ' + stations.length + ' 站';
    $('#progBar').style.width = (c / stations.length * 100) + '%';
    $('#bestScore').textContent = state.best == null ? '總測驗尚未作答' : '總測驗最佳成績：' + state.best + ' / ' + QUIZ.length;
    $$('[data-done]').forEach(b => {
      const on = !!state.done[b.dataset.done];
      b.classList.toggle('on', on);
      b.textContent = on ? '已完成（再按一次可取消）' : '這一站我學會了';
    });
    markCurrent();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-done]');
    if (!b) return;
    const n = b.dataset.done;
    if (state.done[n]) delete state.done[n]; else state.done[n] = 1;
    save(); renderNav();
  });
  let curN = 0;
  function markCurrent() {
    $$('#rail a').forEach(a => a.classList.toggle('cur', +a.dataset.r === curN));
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(en => {
        if (en.isIntersecting) {
          curN = +en.target.dataset.n; markCurrent();
          const a = $('#rail a.cur');
          if (a && a.scrollIntoView) { const r = $('#rail'); r.scrollLeft = a.offsetLeft - r.clientWidth / 2 + a.clientWidth / 2; }
        }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    stations.forEach(s => io.observe(s.el));
  }
  $('#resetAll').addEventListener('click', () => { state = { done: {}, best: null }; save(); renderNav(); });

  /* ---------- 迷思破解（每站的是非題） ---------- */
  const MYTHS = {
    1: [
      { q: '氯化鈉固體不能導電，所以氯化鈉不是電解質。', a: false, why: '錯。電解質看的是「溶於水後」能不能導電。食鹽溶於水會解離成 Na⁺ 和 Cl⁻，可以導電，是電解質。' },
      { q: '酒精可以和水完全互溶，所以酒精水溶液可以導電。', a: false, why: '錯。能溶於水不代表會解離。酒精溶於水後仍是分子，沒有離子，不導電，是非電解質。' },
    ],
    2: [
      { q: '氯化鈣（CaCl₂）水溶液中，正離子和負離子的個數一樣多。', a: false, why: '錯。Ca²⁺ 與 Cl⁻ 的個數比是 1：2。相等的是總電量：1×(+2) 與 2×(−1)。' },
      { q: '電解質水溶液通電時，正離子會往負極移動。', a: true, why: '對。異性相吸：正離子往負極、負離子往正極。' },
    ],
    3: [
      { q: '把稀鹽酸滴在銅片上，會冒出氫氣。', a: false, why: '錯。只有活性大的金屬（鎂、鋅、鐵等）才會和酸反應產生氫氣；銅的活性小，不反應。' },
      { q: '氫氧化鈣俗稱熟石灰，微溶於水，它的澄清水溶液可以用來檢驗二氧化碳。', a: true, why: '對。澄清石灰水遇到二氧化碳會產生白色的碳酸鈣沉澱而變混濁。（灰石則是碳酸鈣，別搞混。）' },
    ],
    4: [
      { q: '在某溶液中滴入酚酞後仍是無色，可以確定這杯溶液是中性。', a: false, why: '錯。酚酞在酸性和中性都是無色，只能確定「不是鹼性」。' },
      { q: 'pH＝2 的溶液，氫離子濃度是 pH＝4 的溶液的 2 倍。', a: false, why: '錯。pH 每差 1 就差 10 倍，差 2 是 10×10＝100 倍。' },
      { q: '酸性溶液裡完全沒有 OH⁻。', a: false, why: '錯。任何水溶液都同時有 H⁺ 和 OH⁻，酸性只是 [H⁺] 比 [OH⁻] 多。' },
    ],
    5: [
      { q: '酸鹼中和時，溶液的溫度會下降。', a: false, why: '錯。酸鹼中和是放熱反應，溫度會上升，恰好完全中和時溫度最高。' },
      { q: '用相同濃度的氫氧化鈉去中和「同體積、同濃度」的鹽酸和硫酸，硫酸需要的氫氧化鈉比較多。', a: true, why: '對。一個 H₂SO₄ 有 2 個 H⁺，是 HCl 的兩倍，所以需要兩倍的氫氧化鈉。' },
    ],
    6: [
      { q: '鹽類的水溶液一定是中性。', a: false, why: '錯。食鹽水是中性，但碳酸鈉、碳酸氫鈉的水溶液是鹼性。' },
      { q: '大理石和貝殼的主要成分是碳酸鈣，它很難溶於水。', a: true, why: '對。碳酸鈣難溶於水，但碰到酸會溶解並冒出二氧化碳。' },
    ],
  };
  $$('[data-myths]').forEach(box => {
    const list = MYTHS[box.dataset.myths] || [];
    box.innerHTML = '<h3>迷思破解 ／ 這句話對不對？</h3>' + list.map((m, i) =>
      `<div class="myth" data-i="${i}"><p class="q">${m.q}</p><div class="ox"><button type="button" data-v="1" aria-label="對">○</button><button type="button" data-v="0" aria-label="錯">✕</button></div><p class="why"></p></div>`).join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      const card = b.closest('.myth'); const m = list[+card.dataset.i];
      const ok = (b.dataset.v === '1') === m.a;
      card.classList.add(ok ? 'right' : 'wrong');
      $('.why', card).textContent = (ok ? '答對了！' : '再想想——') + m.why;
    });
  });

  /* ---------- 第 1 站：導電實驗 ---------- */
  const COND = [
    { k: '食鹽水', glow: 1, type: 'ion', color: '#cfe8f5', t: '燈泡亮了！', d: '氯化鈉溶於水解離成 Na⁺ 和 Cl⁻，離子可以帶著電荷移動。氯化鈉是<b>電解質</b>。' },
    { k: '糖水', glow: 0, type: 'mol', color: '#f3ead0', t: '燈泡不亮', d: '蔗糖溶於水後還是一顆顆不帶電的分子，沒有離子，不能導電。蔗糖是<b>非電解質</b>。' },
    { k: '鹽酸', glow: 1, type: 'ion', color: '#fbe0df', t: '燈泡亮了！', d: '氯化氫溶於水解離成 H⁺ 和 Cl⁻。酸都是<b>電解質</b>。' },
    { k: '食醋', glow: .45, type: 'ion', color: '#f5e6c8', few: true, t: '燈泡微微亮', d: '醋酸只有一小部分解離成離子（弱酸），離子少所以燈比較暗——但它仍是<b>電解質</b>。' },
    { k: '氫氧化鈉水溶液', glow: 1, type: 'ion', color: '#dfe6fb', t: '燈泡亮了！', d: '氫氧化鈉解離成 Na⁺ 和 OH⁻。鹼也都是<b>電解質</b>。' },
    { k: '酒精水溶液', glow: 0, type: 'mol', color: '#eaf4fa', t: '燈泡不亮', d: '酒精能和水互溶，但不會解離，溶液裡只有分子。酒精是<b>非電解質</b>。' },
    { k: '純水', glow: 0, type: 'none', color: '#eaf4fa', t: '燈泡不亮', d: '純水幾乎不解離，離子太少，幾乎不導電。' },
    { k: '食鹽固體', glow: 0, type: 'solid', color: 'none', t: '燈泡不亮——但別被騙了', d: '固體裡的離子被固定住不能移動，所以不導電。可是食鹽<b>溶於水後</b>能導電，所以它<b>是電解質</b>。' },
    { k: '銅線', glow: 1, type: 'metal', color: 'none', t: '燈泡亮了——但別被騙了', d: '銅是金屬，靠自由電子導電。它是<b>元素</b>不是化合物，所以<b>不是電解質</b>。' },
  ];
  const condIons = $('#condIons');
  function drawIons(c) {
    condIons.innerHTML = '';
    if (c.type === 'metal') {
      condIons.innerHTML = '<path d="M110 240 Q160 290 210 240" fill="none" stroke="#c9722b" stroke-width="7" stroke-linecap="round"/>';
      return;
    }
    if (c.type !== 'ion' && c.type !== 'mol') return;
    const pts = [[136, 196], [182, 206], [150, 232], [190, 244], [130, 256], [168, 262], [176, 180], [142, 214]];
    const n = c.few ? 3 : pts.length;
    let h = '';
    pts.slice(0, c.type === 'mol' ? 6 : n).forEach((p, i) => {
      if (c.type === 'mol') {
        h += `<g class="g-mol" style="animation-delay:${-i * .4}s"><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="#a7a299"/></g>`;
      } else {
        const pos = i % 2 === 0;
        h += `<g class="${pos ? 'g-pos' : 'g-neg'}" style="animation-delay:${-i * .3}s"><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${pos ? '#e5484d' : '#3e63dd'}"/><text x="${p[0]}" y="${p[1] + 3.5}" class="ion">${pos ? '+' : '−'}</text></g>`;
      }
    });
    if (c.few) pts.slice(3, 7).forEach((p, i) => { h += `<g class="g-mol" style="animation-delay:${-i * .5}s"><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="#a7a299"/></g>`; });
    condIons.innerHTML = h;
  }
  const condChips = $('#condChips');
  condChips.innerHTML = COND.map((c, i) => `<button type="button" class="chip" data-i="${i}">${c.k}</button>`).join('');
  condChips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', condChips).forEach(x => x.classList.toggle('on', x === b));
    const c = COND[+b.dataset.i];
    $('#glow').setAttribute('opacity', c.glow * .85);
    $('#bulb').style.fill = c.glow ? (c.glow < 1 ? '#c9a93a' : '#ffd23f') : '#55524b';
    const liq = $('#condLiquid');
    liq.setAttribute('opacity', c.color === 'none' ? 0 : .9);
    if (c.color !== 'none') liq.setAttribute('fill', c.color);
    $('#condSolid').setAttribute('opacity', c.type === 'solid' ? 1 : 0);
    drawIons(c);
    const r = $('#condResult');
    r.className = 'result ' + (c.glow ? 'yes' : 'no');
    r.innerHTML = `<b>${c.k}：${c.t}</b><p>${c.d}</p>`;
  });

  /* ---------- 第 2 站：解離 ---------- */
  const DIS = [
    { f: 'NaCl', name: '氯化鈉', p: ['Na^+', 1, 1], n: ['Cl^-', 1, 1] },
    { f: 'CaCl2', name: '氯化鈣', p: ['Ca^2+', 1, 2], n: ['Cl^-', 2, 1] },
    { f: 'HCl', name: '氯化氫（鹽酸）', p: ['H^+', 1, 1], n: ['Cl^-', 1, 1] },
    { f: 'H2SO4', name: '硫酸', p: ['H^+', 2, 1], n: ['SO4^2-', 1, 2] },
    { f: 'NaOH', name: '氫氧化鈉', p: ['Na^+', 1, 1], n: ['OH^-', 1, 1] },
    { f: 'Ca(OH)2', name: '氫氧化鈣', p: ['Ca^2+', 1, 2], n: ['OH^-', 2, 1] },
  ];
  let disI = 1, disN = 1;
  const disChips = $('#disChips');
  disChips.innerHTML = DIS.map((d, i) => `<button type="button" class="chip${i === disI ? ' on' : ''}" data-i="${i}">${chem(d.f)}</button>`).join('');
  function renderDis() {
    const d = DIS[disI];
    const co = k => (k > 1 ? k : '');
    $('#disEq').innerHTML = `${chem(d.f)} → ${co(d.p[1])}${chem(d.p[0])} + ${co(d.n[1])}${chem(d.n[0])}`;
    const np = d.p[1] * disN, nn = d.n[1] * disN;
    let h = '';
    for (let i = 0; i < np; i++) h += `<span class="iondot p" style="animation-delay:${i * .03}s">${chem(d.p[0])}</span>`;
    for (let i = 0; i < nn; i++) h += `<span class="iondot n" style="animation-delay:${(np + i) * .03}s">${chem(d.n[0])}</span>`;
    $('#disIons').innerHTML = h;
    $('#disN').textContent = disN;
    const same = np === nn;
    $('#disBalance').innerHTML =
      `<div class="side p"><small>正離子 ${chem(d.p[0])}</small><b>${np} 個 × (+${d.p[2]}) ＝ +${np * d.p[2]}</b></div><div class="mid">＝</div>` +
      `<div class="side n"><small>負離子 ${chem(d.n[0])}</small><b>${nn} 個 × (−${d.n[2]}) ＝ −${nn * d.n[2]}</b></div>` +
      `<div class="verdict">${d.name}：正負離子個數 ${np}：${nn}（${same ? '剛好一樣多' : '<b>不一樣多</b>'}），但總電量一正一負剛好抵消 → 溶液呈<b>電中性</b>。</div>`;
  }
  disChips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    disI = +b.dataset.i; $$('.chip', disChips).forEach(x => x.classList.toggle('on', x === b)); renderDis();
  });
  $('#disMinus').addEventListener('click', () => { disN = Math.max(1, disN - 1); renderDis(); });
  $('#disPlus').addEventListener('click', () => { disN = Math.min(5, disN + 1); renderDis(); });
  renderDis();

  /* ---------- 第 3 站：藥品櫃 ---------- */
  const SHELF = {
    acid: [
      { n: '鹽酸', f: 'HCl', aka: '氯化氫的水溶液', c: '#e5484d', li: ['濃鹽酸有揮發性，打開瓶蓋會冒白霧', '胃酸的主要成分', '用途：清洗金屬表面、清潔廁所'] },
      { n: '硫酸', f: 'H2SO4', aka: '一個分子可放出 2 個 H⁺', c: '#f46036', li: ['不易揮發；濃硫酸有<b>脫水性</b>，會讓糖、紙變黑', '溶於水放出大量的熱 → 稀釋要「酸入水」', '用途：鉛蓄電池、製造肥料'] },
      { n: '硝酸', f: 'HNO3', aka: '照光易分解，用棕色瓶裝', c: '#f59e0b', li: ['有揮發性、腐蝕性強', '濃硝酸久置會變黃', '用途：製造肥料、炸藥'] },
      { n: '醋酸', f: 'CH3COOH', aka: '食醋的酸味來源・弱酸', c: '#d9a400', li: ['只有少部分解離，酸性較弱', '食醋中約含 3～5%', '用途：調味、食品加工'] },
    ],
    base: [
      { n: '氫氧化鈉', f: 'NaOH', aka: '俗稱燒鹼、苛性鈉', c: '#3e63dd', li: ['白色固體，易吸收水氣而<b>潮解</b>', '溶於水會放熱；強鹼，會腐蝕皮膚', '用途：製造肥皂、疏通水管'] },
      { n: '氫氧化鈣', f: 'Ca(OH)2', aka: '俗稱熟石灰、消石灰', c: '#1b98e0', li: ['<b>微溶</b>於水，澄清液稱為石灰水', '石灰水遇 CO₂ 會變混濁 → 檢驗二氧化碳', '用途：中和酸性土壤、建築材料'] },
      { n: '氨水', f: 'NH3', aka: '氨氣的水溶液・弱鹼', c: '#6e56cf', li: ['氨氣有刺激性臭味，<b>極易</b>溶於水', '比空氣輕', '用途：製造肥料、家用清潔劑'] },
    ],
  };
  function renderShelf(tab) {
    const el = $('#shelf');
    if (tab === 'cmp') {
      el.innerHTML = `<table class="mini"><tr><th></th><th><span class="tag acid">酸</span></th><th><span class="tag base">鹼</span></th></tr>
        <tr><td>解離出</td><td class="mono">H<sup>+</sup></td><td class="mono">OH<sup>−</sup></td></tr>
        <tr><td>味道／觸感</td><td>酸味</td><td>澀味、摸起來滑膩</td></tr>
        <tr><td>石蕊試紙</td><td>藍色 → 紅色</td><td>紅色 → 藍色</td></tr>
        <tr><td>酚酞</td><td>無色</td><td>紅色</td></tr>
        <tr><td>遇活性大的金屬（鎂、鋅）</td><td>產生<b>氫氣</b></td><td>—</td></tr>
        <tr><td>遇碳酸鹽（大理石、小蘇打）</td><td>產生<b>二氧化碳</b></td><td>—</td></tr>
        <tr><td>遇油脂</td><td>—</td><td>可溶解油脂（所以能清潔、通水管）</td></tr>
        <tr><td>pH（25 ℃）</td><td>小於 7</td><td>大於 7</td></tr></table>
        <p class="small" style="grid-column:1/-1;margin:0">提醒：實驗室的藥品不可以用嘴嘗、也不要直接用手摸，這裡的味道與觸感只是性質描述。</p>`;
      return;
    }
    el.innerHTML = SHELF[tab].map(b =>
      `<div class="bottle" style="--c:${b.c}"><h4>${b.n} <span class="f">${chem(b.f)}</span></h4><p class="aka">${b.aka}</p><ul>${b.li.map(x => '<li>' + x + '</li>').join('')}</ul></div>`).join('');
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('on', x === t)); renderShelf(t.dataset.tab);
  }));
  renderShelf('acid');

  /* ---------- 第 4 站：pH 與指示劑 ---------- */
  const UNI = ['#d7263d', '#e03a2f', '#ea5a2b', '#f17a25', '#f59e0b', '#f5c518', '#c8d42a', '#2f9e5a', '#1fa39a', '#1b98e0', '#2f7fe0', '#3e63dd', '#5548c8', '#6a2fb5', '#6e2594'];
  const UNI_N = ['紅', '紅', '紅', '橙紅', '橙', '黃', '黃綠', '綠', '藍綠', '藍', '藍', '靛', '靛紫', '紫', '紫'];
  const EX = ['很濃的強酸', '胃酸', '檸檬汁', '食醋、汽水', '番茄汁', '黑咖啡、正常雨水', '牛奶', '純水', '海水', '小蘇打水', '肥皂水', '氨水', '石灰水', '漂白水', '很濃的強鹼'];
  function renderPH() {
    const v = +$('#phRange').value;
    $('#phVal').textContent = v;
    const st = v < 7 ? ['酸性', '#e5484d'] : v > 7 ? ['鹼性', '#3e63dd'] : ['中性', '#2f9e5a'];
    const s = $('#phState'); s.textContent = st[0]; s.style.background = st[1];
    $('#phEx').textContent = '大約像：' + EX[v];
    $('#phH').innerHTML = '[H<sup>+</sup>] ＝ ' + pow10(-v);
    $('#phOH').innerHTML = '[OH<sup>−</sup>] ＝ ' + pow10(-(14 - v));
    $('#phCmp').textContent = v < 7 ? '＞' : v > 7 ? '＜' : '＝';
    $('#tLitmus').style.background = v < 7 ? '#e5484d' : v > 7 ? '#3e63dd' : '#8e4ec6';
    $('#nLitmus').textContent = v < 7 ? '紅色' : v > 7 ? '藍色' : '紫色';
    const ph = $('#tPhth');
    if (v <= 7) { ph.style.background = 'rgba(200,225,240,.35)'; $('#nPhth').textContent = '無色'; }
    else if (v === 8) { ph.style.background = '#fbd3e3'; $('#nPhth').textContent = '剛開始變色（很淡）'; }
    else { ph.style.background = '#e93d82'; $('#nPhth').textContent = '紅色'; }
    $('#tUni').style.background = UNI[v]; $('#nUni').textContent = UNI_N[v] + '色';
  }
  $('#phRange').addEventListener('input', renderPH); renderPH();

  // 稀釋：含水的自解離，所以不會超過 7
  let dilK = 0; const DIL0 = 2;
  function dilPH(k) { const c = Math.pow(10, -(DIL0 + k)); const h = c / 2 + Math.sqrt(c * c / 4 + 1e-14); return -Math.log10(h); }
  function renderDil() {
    const p = dilPH(dilK);
    $('#dilPH').textContent = p.toFixed(2);
    $('#dilMark').style.left = Math.min(100, (p - DIL0) / (7 - DIL0) * 100) + '%';
    const total = Math.pow(10, dilK);
    $('#dilMsg').innerHTML = dilK === 0 ? '稀釋 10 倍，[H<sup>+</sup>] 變成 1/10，pH 加 1。'
      : dilK <= 4 ? `已稀釋 ${total.toLocaleString()} 倍，pH 上升了 ${dilK}。`
        : `已稀釋 ${total.toLocaleString()} 倍，pH 卻停在 7 的前面——<b>酸再怎麼稀釋也不會變成鹼</b>，只會越來越接近中性。`;
  }
  $('#dilBtn').addEventListener('click', () => { dilK = Math.min(9, dilK + 1); renderDil(); });
  $('#dilReset').addEventListener('click', () => { dilK = 0; renderDil(); });
  renderDil();

  // 莫耳濃度
  const SOL = [['NaOH', 40, '23＋16＋1'], ['HCl', 36.5, '1＋35.5'], ['NaCl', 58.5, '23＋35.5'], ['H2SO4', 98, '1×2＋32＋16×4'], ['Ca(OH)2', 74, '40＋(16＋1)×2']];
  const fmt = x => { const r = Math.round(x * 10000) / 10000; return String(r); };
  $('#mSolute').innerHTML = SOL.map((s, i) => `<option value="${i}">${s[0]}（分子量 ${s[1]}）</option>`).join('');
  function renderM() {
    const s = SOL[+$('#mSolute').value], m = parseFloat($('#mMass').value), v = parseFloat($('#mVol').value);
    if (!(m >= 0) || !(v > 0)) { $('#mSteps').innerHTML = '<li>請輸入質量與大於 0 的體積。</li>'; return; }
    const mol = m / s[1], L = v / 1000;
    $('#mSteps').innerHTML =
      `<li>分子量：${chem(s[0])} ＝ ${s[2]} ＝ <b>${s[1]}</b></li>` +
      `<li>莫耳數 ＝ 質量 ÷ 分子量 ＝ ${fmt(m)} ÷ ${s[1]} ＝ <b>${fmt(mol)} mol</b></li>` +
      `<li>體積換成公升：${fmt(v)} mL ＝ <b>${fmt(L)} L</b></li>` +
      `<li class="ans">莫耳濃度 ＝ ${fmt(mol)} ÷ ${fmt(L)} ＝ <b>${fmt(mol / L)} M</b></li>`;
  }
  ['mSolute', 'mMass', 'mVol'].forEach(id => $('#' + id).addEventListener('input', renderM)); renderM();

  /* ---------- 第 5 站：滴定 ---------- */
  const TIT = { Ma: 1.0, Va: 20, Mb: 1.0 };
  let acid = 'HCl';
  const nH = () => TIT.Ma * TIT.Va * (acid === 'HCl' ? 1 : 2);           // mmol
  const temp = vb => 25 + 57 * Math.min(nH(), TIT.Mb * vb) / ((TIT.Va + vb) * 4.18); // ΔT = Q/(m·s)
  function drawChart(vb) {
    const X = v => 36 + v / 60 * 270, Y = t => 146 - (t - 25) / 15 * 130;
    let h = '';
    for (let t = 25; t <= 40; t += 5) h += `<line class="gr" x1="36" x2="306" y1="${Y(t)}" y2="${Y(t)}"/><text x="30" y="${Y(t) + 3}" text-anchor="end">${t}</text>`;
    for (let v = 0; v <= 60; v += 10) h += `<text x="${X(v)}" y="160" text-anchor="middle">${v}</text>`;
    let pts = ''; for (let v = 0; v <= 60; v++) pts += X(v) + ',' + Y(temp(v)).toFixed(1) + ' ';
    h += `<path class="ax" d="M36 12 V146 H308"/><polyline class="ln" points="${pts}"/>`;
    h += `<line x1="${X(vb)}" x2="${X(vb)}" y1="12" y2="146" stroke="#e5484d" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    h += `<circle cx="${X(vb)}" cy="${Y(temp(vb))}" r="5.5" fill="#e5484d" stroke="#fffdf7" stroke-width="2"/>`;
    h += `<text x="306" y="170" text-anchor="end">加入 NaOH（mL）</text><text x="38" y="9">℃</text>`;
    $('#titChart').innerHTML = h;
  }
  function renderTit(animate) {
    const vb = +$('#titRange').value, h0 = nH(), oh = TIT.Mb * vb;
    const exH = Math.max(0, h0 - oh), exOH = Math.max(0, oh - h0), vt = TIT.Va + vb;
    const eqV = h0 / TIT.Mb;
    $('#titVb').textContent = vb;
    $('#titSetup').innerHTML = `燒杯裡有 <b>${TIT.Ma.toFixed(1)} M ${acid === 'HCl' ? '鹽酸' : '硫酸'} ${TIT.Va} mL</b>，已滴入酚酞。拉動滑桿把氫氧化鈉滴進去：`;
    let pH, cls, title, desc;
    if (exH > 1e-9) { pH = -Math.log10(exH / vt); cls = 'acidic'; title = '酸過量 → 酸性'; desc = `還有 ${fmt(exH)} mmol 的 H<sup>+</sup> 沒被中和。酚酞<b>無色</b>。再滴 ${fmt(eqV - vb)} mL 就恰好中和。`; }
    else if (exOH > 1e-9) { pH = 14 + Math.log10(exOH / vt); cls = 'basic'; title = '鹼過量 → 鹼性'; desc = `H<sup>+</sup> 已用完，多出 ${fmt(exOH)} mmol 的 OH<sup>−</sup>。酚酞變<b>紅色</b>。`; }
    else { pH = 7; cls = 'neutral'; title = '恰好完全中和 → 中性'; desc = `H<sup>+</sup> 與 OH<sup>−</sup> 剛好都用完，杯裡只剩鹽和水。這時溫度最高。`; }
    const r = $('#titResult'); r.className = 'result ' + cls;
    r.innerHTML = `<b>${title}（pH ≈ ${Math.max(0, pH).toFixed(1)}）</b><p>${desc}</p>`;
    const liq = $('#titLiquid'), hgt = 44 + vb * 1.25;
    liq.setAttribute('height', hgt); liq.setAttribute('y', 274 - hgt);
    liq.setAttribute('fill', exOH > 1e-9 ? '#f472b6' : '#eaf4fa');
    $('#burFill').setAttribute('height', 88 * (1 - vb / 60)); $('#burFill').setAttribute('y', 8 + 88 * (vb / 60));
    $('#titVolT').textContent = '杯內 ' + vt + ' mL';
    $('#titTemp').textContent = temp(vb).toFixed(1);
    const an = acid === 'HCl' ? ['Cl^-', TIT.Ma * TIT.Va] : ['SO4^2-', TIT.Ma * TIT.Va];
    const max = Math.max(h0, TIT.Mb * 60);
    const bars = [['H^+', exH, '#e5484d'], ['OH^-', exOH, '#3e63dd'], ['Na^+', oh, '#8d8a82'], [an[0], an[1], '#b8b3a7'], ['生成的水', Math.min(h0, oh), '#2f9e5a']];
    $('#titBars').innerHTML = bars.map(b => `<div class="bar"><span class="nm">${chem(b[0])}</span><span class="tr"><i style="width:${b[1] / max * 100}%;background:${b[2]}"></i></span><span class="v">${fmt(b[1])} mmol</span></div>`).join('');
    drawChart(vb);
    if (animate) { const d = $('#drop'); d.classList.remove('go'); void d.getBoundingClientRect(); d.classList.add('go'); }
  }
  $('#titRange').addEventListener('input', () => renderTit(true));
  $('#titAcid').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    acid = b.dataset.a; $$('#titAcid button').forEach(x => x.classList.toggle('on', x === b));
    $('#titRange').value = 0; renderTit(false);
  });
  renderTit(false);

  /* ---------- 第 6 站：鹽類 ---------- */
  const SALTS = [
    { f: 'NaCl', n: '氯化鈉', aka: '食鹽', sol: '易溶', ph: '中性', use: '調味、醃漬、生理食鹽水' },
    { f: 'CaCO3', n: '碳酸鈣', aka: '大理石、灰石、貝殼的主成分', sol: '難溶', ph: '—', use: '建材、製水泥；遇酸冒 CO₂' },
    { f: 'CaSO4', n: '硫酸鈣', aka: '石膏的主成分', sol: '微溶', ph: '—', use: '石膏像、固定骨折、豆花凝固劑' },
    { f: 'Na2CO3', n: '碳酸鈉', aka: '蘇打、洗滌鹼', sol: '易溶', ph: '鹼性', use: '清潔劑、製玻璃' },
    { f: 'NaHCO3', n: '碳酸氫鈉', aka: '小蘇打、焙用鹼', sol: '可溶', ph: '弱鹼性', use: '發粉、胃藥（制酸劑）、乾粉滅火器' },
  ];
  $('#salts').innerHTML = SALTS.map(s =>
    `<div class="salt"><div class="f">${chem(s.f)}</div><h4>${s.n}</h4><p class="aka">${s.aka}</p><dl><dt>溶解性</dt><dd>${s.sol}</dd><dt>水溶液</dt><dd>${s.ph}</dd><dt>用途</dt><dd>${s.use}</dd></dl></div>`).join('');

  /* ---------- 第 7 站：總測驗 ---------- */
  const QUIZ = [
    { st: 1, tp: '電解質', q: '下列哪一項推論正確？', o: ['食鹽固體不導電，所以食鹽不是電解質', '蔗糖易溶於水，所以糖水可以導電', '醋酸水溶液可以導電，所以醋酸是電解質', '銅可以導電，所以銅是電解質'], a: 2, ex: '電解質是「溶於水後能導電的化合物」。食鹽溶於水可導電，是電解質；蔗糖不解離；銅是元素，不是電解質。' },
    { st: 2, tp: '解離與離子', q: '氯化鎂溶於水：MgCl₂ → Mg²⁺ + 2Cl⁻。若溶液中有 100 個 Mg²⁺，下列何者正確？', o: ['Cl⁻ 有 100 個，溶液帶正電', 'Cl⁻ 有 200 個，溶液呈電中性', 'Cl⁻ 有 50 個，溶液呈電中性', 'Cl⁻ 有 200 個，溶液帶負電'], a: 1, ex: 'Mg²⁺：Cl⁻ ＝ 1：2，所以 Cl⁻ 有 200 個。正電 100×2＝200，負電 200×1＝200，總電量相等，電中性。' },
    { st: 3, tp: '常見的酸與鹼', q: '稀釋濃硫酸的正確做法是哪一個？', o: ['把水快速倒入濃硫酸中', '把濃硫酸沿玻棒緩緩倒入水中並攪拌', '兩者同時倒入空燒杯', '先加熱濃硫酸再加水'], a: 1, ex: '「酸入水」。濃硫酸溶於水放出大量的熱，若把水倒入酸，水會沸騰噴濺。' },
    { st: 3, tp: '常見的酸與鹼', q: '下列關於鹼的敘述，何者正確？', o: ['氨氣難溶於水', '氫氧化鈣俗稱灰石，易溶於水', '氫氧化鈉俗稱燒鹼，易潮解，溶於水會放熱', '鹼性溶液嘗起來有酸味'], a: 2, ex: '氨氣極易溶於水；氫氧化鈣俗稱熟石灰、微溶於水（灰石是碳酸鈣）；有酸味的是酸。' },
    { st: 4, tp: '指示劑', q: '某無色溶液滴入酚酞後仍為無色，這杯溶液的酸鹼性是？', o: ['一定是酸性', '一定是中性', '一定是鹼性', '可能是酸性，也可能是中性'], a: 3, ex: '酚酞在酸性、中性都是無色，只在鹼性呈紅色，所以只能排除鹼性。' },
    { st: 4, tp: 'pH 值', q: '25 ℃ 時，甲溶液 pH＝1，乙溶液 pH＝4。甲的 [H⁺] 是乙的幾倍？', o: ['3 倍', '4 倍', '30 倍', '1000 倍'], a: 3, ex: 'pH 差 3，[H⁺] 相差 10×10×10＝1000 倍。' },
    { st: 4, tp: 'pH 值', q: '取 pH＝2 的鹽酸 1 mL，加水稀釋成 1000 mL，pH 值約為多少？', o: ['2', '5', '7', '9'], a: 1, ex: '稀釋 1000 倍，[H⁺] 由 10⁻² M 變成 10⁻⁵ M，pH＝5。酸稀釋後 pH 上升，但不會超過 7。' },
    { st: 4, tp: '莫耳濃度', q: '將 2 g 氫氧化鈉（NaOH＝40）溶於水配成 250 mL 溶液，莫耳濃度是多少？', o: ['0.05 M', '0.2 M', '0.5 M', '8 M'], a: 1, ex: '莫耳數＝2÷40＝0.05 mol；體積＝0.25 L；濃度＝0.05÷0.25＝0.2 M。' },
    { st: 5, tp: '酸鹼中和', q: '0.5 M 的鹽酸 20 mL，要用 0.25 M 的氫氧化鈉水溶液多少 mL 才能恰好完全中和？', o: ['10 mL', '20 mL', '40 mL', '80 mL'], a: 2, ex: 'M酸×V酸＝M鹼×V鹼：0.5×20＝0.25×V，V＝40 mL。' },
    { st: 5, tp: '酸鹼中和', q: '0.2 M 的硫酸（H₂SO₄）10 mL，要用 0.1 M 的氫氧化鈉水溶液多少 mL 才能恰好完全中和？', o: ['10 mL', '20 mL', '40 mL', '5 mL'], a: 2, ex: '硫酸一個分子有 2 個 H⁺：0.2×10×2＝0.1×V，V＝40 mL。忘了乘 2 會算成 20 mL。' },
    { st: 5, tp: '酸鹼中和', q: '在滴有酚酞的鹽酸中逐滴加入氫氧化鈉，直到溶液變成紅色。此時溶液中數量較多的離子是？', o: ['H⁺、Cl⁻、Na⁺', 'Na⁺、Cl⁻', 'Na⁺、Cl⁻、OH⁻', 'H⁺、OH⁻'], a: 2, ex: '酚酞變紅表示鹼已過量：H⁺ 用完了，Na⁺ 和 Cl⁻ 不參與反應留在溶液中，再加上多出來的 OH⁻。' },
    { st: 6, tp: '鹽類', q: '做麵包時加入的「小蘇打」受熱會放出氣體使麵糰膨脹。小蘇打的成分和放出的氣體分別是？', o: ['碳酸鈉；氧氣', '碳酸氫鈉；二氧化碳', '碳酸鈣；二氧化碳', '硫酸鈣；氫氣'], a: 1, ex: '小蘇打是碳酸氫鈉（NaHCO₃），受熱分解產生二氧化碳。蘇打（洗滌鹼）才是碳酸鈉。' },
  ];
  const L = 'ABCD';
  const answers = new Array(QUIZ.length).fill(null);
  const esc = s => s;
  function renderQuiz() {
    $('#quiz').innerHTML = QUIZ.map((q, i) =>
      `<div class="qz" data-i="${i}"><div class="qh"><span class="qn">${i + 1}</span><p class="qt">${esc(q.q)}</p></div><p class="tp">${q.tp}</p><div class="os">${q.o.map((o, j) => `<button type="button" class="o" data-j="${j}"><i>${L[j]}</i><span>${esc(o)}</span></button>`).join('')}</div><div class="ex"></div></div>`).join('');
    $('#quizScore').hidden = true;
  }
  $('#quiz').addEventListener('click', e => {
    const b = e.target.closest('.o'); if (!b) return;
    const card = b.closest('.qz'); if (card.classList.contains('lock')) return;
    const i = +card.dataset.i, j = +b.dataset.j, q = QUIZ[i];
    answers[i] = j; card.classList.add('lock');
    $$('.o', card)[q.a].classList.add('good');
    if (j !== q.a) b.classList.add('bad');
    $('.ex', card).innerHTML = (j === q.a ? '<b>答對了！</b>' : `<b>正確答案是 (${L[q.a]})。</b>`) + q.ex;
    if (answers.every(x => x !== null)) finishQuiz();
  });
  function finishQuiz() {
    const score = QUIZ.reduce((s, q, i) => s + (answers[i] === q.a ? 1 : 0), 0);
    if (state.best == null || score > state.best) state.best = score;
    const weak = {};
    QUIZ.forEach((q, i) => { if (answers[i] !== q.a) (weak[q.st] = weak[q.st] || []).push(i + 1); });
    const keys = Object.keys(weak);
    if (score === QUIZ.length) state.done[7] = 1;
    save(); renderNav();
    const el = $('#quizScore'); el.hidden = false;
    el.innerHTML = `<div class="big">${score} / ${QUIZ.length}</div><p>${score === QUIZ.length ? '全對！這個單元你已經掌握了。' : score >= 10 ? '很不錯，把錯的幾題補起來就完整了。' : '沒關係，照下面的建議回去把那幾站重玩一次。'}</p>` +
      (keys.length ? '<ul>' + keys.map(k => `<li>第 ${weak[k].join('、')} 題答錯 → 回到 <a href="#s${k}">第 ${k} 站「${stations[k - 1].title}」</a></li>`).join('') + '</ul>' : '') +
      `<button type="button" class="btn" id="quizAgain">再測一次</button>`;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  document.addEventListener('click', e => {
    if (e.target.id !== 'quizAgain') return;
    answers.fill(null); renderQuiz(); $('#s7').scrollIntoView({ behavior: 'smooth' });
  });
  renderQuiz();
  renderNav();
})();
