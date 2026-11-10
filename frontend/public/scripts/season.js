// Holiday animation, in the site's colors. The season band carries data-effect="christmas" etc.
// Christmas: snow; Thanksgiving: tumbling leaves with gusts of wind; Halloween: bats and a spider;
// Valentine's: rising hearts; Easter: petals; 4th of July: fireworks; back to school: a paper airplane.
// The pause button in the band turns it off (remembered); devices asking for less motion start paused.
(function () {
// makeFX(band): the animation for one season band. The site starts it below; the preview page reuses it.
function makeFX(band, opts = {}) {
  const kind = band.dataset.effect;
  // How much: 0.5 a little, 1 medium, 1.8 a lot (set in backend/config/shop.js SEASON_INTENSITY)
  const amount = Math.max(.2, Math.min(3, +(opts.amount || band.dataset.intensity || 1)));
  const root = opts.root || document.body;
  const n = base => Math.max(1, Math.round(base * amount));
  const ms = base => base / amount;
  const C = { rust: '#b5652c', gold: '#c9a227', mauve: '#a97c86', blue: '#4a5ca3', green: '#2f6a64', ink: '#1c2233', brown: '#7a5a44', pink: '#e3b3c0', sky: '#9fb0e6', mint: '#a9cfc6', cream: '#ead9a6' };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const small = innerWidth < 600;

  // Pause / play, remembered on this device
  const btn = band.querySelector('.season-toggle');
  let on = opts.on ?? !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (opts.on === undefined) { try { const saved = localStorage.getItem('vc-anim'); if (saved) on = saved === 'on'; } catch (e) {} }
  let layer = null, timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const every = (fn, ms) => timers.push(setInterval(fn, ms));

  // One falling (or rising) piece: an outer element moves, the inner one sways or spins
  function piece(html, { up = false, dur = [8, 13], delay = [0, 8], left = [0, 100], cls = '' } = {}) {
    const outer = document.createElement('span'), inner = document.createElement('span');
    outer.className = `vc-p ${up ? 'vc-up' : 'vc-down'}`;
    outer.style.left = rand(...left) + 'vw';
    outer.style.animationDuration = rand(...dur) + 's';
    outer.style.animationDelay = (-rand(...delay)) + 's';   // negative delay: already mid-fall when the page opens
    inner.className = 'vc-sway ' + cls;
    inner.style.animationDuration = rand(2.4, 4.6) + 's';
    inner.innerHTML = html;
    outer.appendChild(inner);
    layer.appendChild(outer);
    return outer;
  }
  // Something crossing the screen once (bats, paper airplane), then removed
  function fly(html, { y = [8, 45], dur = [7, 11], cls = '', rtl = Math.random() < .5 } = {}) {
    const el = document.createElement('span');
    el.className = `vc-fly ${rtl ? 'vc-rtl' : ''} ${cls}`;
    el.style.top = rand(...y) + 'vh';
    const d = rand(...dur);
    el.style.animationDuration = d + 's';
    el.innerHTML = html;
    layer.appendChild(el);
    setTimeout(() => el.remove(), d * 1000 + 200);
  }

  // Leaves: five shapes, each fading between two fall colors, some spotted, some mirrored
  const LEAVES = {
    maple: ['M12,1 L13.6,5.2 L16.2,3.8 L15.6,8.6 L20.2,6.8 L19,10 L23,10.6 L19.4,13.6 L20.6,15.4 L15.2,15.4 L15.8,18.6 L12.8,17.2 L12.8,21 L11.2,21 L11.2,17.2 L8.2,18.6 L8.8,15.4 L3.4,15.4 L4.6,13.6 L1,10.6 L5,10 L3.8,6.8 L8.4,8.6 L7.8,3.8 L10.4,5.2 Z', 'M12,17 V4 M12,13 L18.5,8 M12,13 L5.5,8 M12,15.5 L17.5,14.5 M12,15.5 L6.5,14.5'],
    oak: ['M12,1 C14,2 13.5,4 15.5,4.5 C17.5,5 16,7 17.5,8 C19,9 17,11 18.5,12.5 C20,14 17,15 17,16.5 C17,18.5 14.5,18 13.2,19.5 L12.6,21 L11.4,21 L10.8,19.5 C9.5,18 7,18.5 7,16.5 C7,15 4,14 5.5,12.5 C7,11 5,9 6.5,8 C8,7 6.5,5 8.5,4.5 C10.5,4 10,2 12,1 Z', 'M12,20 V3 M12,6 L14.8,5 M12,9 L15.8,8.4 M12,12.5 L16.6,12.6 M12,16 L15.6,16.4 M12,6 L9.2,5 M12,9 L8.2,8.4 M12,12.5 L7.4,12.6 M12,16 L8.4,16.4'],
    elm: ['M12,1.5 C17,4 18.5,9 17.5,13 C16.8,16 14.5,18.5 12.6,19.5 L12.6,21 L11.4,21 L11.4,19.5 C9.5,18.5 7.2,16 6.5,13 C5.5,9 7,4 12,1.5 Z', 'M12,20 V3.5 M12,7 L15.2,5.6 M12,10 L16.4,8.6 M12,13 L16.6,12 M12,16 L15,15.6 M12,7 L8.8,5.6 M12,10 L7.6,8.6 M12,13 L7.4,12 M12,16 L9,15.6'],
    aspen: ['M12,2 C16.5,3 20,7 19.5,11.5 C19,16 15.5,19 12.6,19.6 L12.6,21 L11.4,21 L11.4,19.6 C8.5,19 5,16 4.5,11.5 C4,7 7.5,3 12,2 Z', 'M12,20 V4 M12,8 L16.5,6.5 M12,8 L7.5,6.5 M12,12 L17.5,11 M12,12 L6.5,11 M12,16 L15.5,15.5 M12,16 L8.5,15.5'],
    willow: ['M12,0.5 C14.6,4 15.2,10 14.2,15 C13.6,17.5 12.9,19 12.5,20 L12.5,21 L11.5,21 L11.5,20 C11.1,19 10.4,17.5 9.8,15 C8.8,10 9.4,4 12,0.5 Z', 'M12,20.5 V2 M12,7 L13.7,5.8 M12,10.5 L14.2,9.4 M12,14 L13.9,13 M12,7 L10.3,5.8 M12,10.5 L9.8,9.4 M12,14 L10.1,13'],
  };
  const FALL = [['#d9b04a', '#b5652c'], ['#b5652c', '#8f3b2a'], ['#c9a227', '#9a7a2a'], ['#a97c86', '#b5652c'], ['#dcc070', '#8a8a42'], ['#c46a3a', '#c9a227'], ['#8f3b2a', '#a97c86'], ['#7a5a44', '#c46a3a']];
  let leafId = 0;
  const leaf = () => {
    const [shape, veins] = pick(Object.values(LEAVES)), [c1, c2] = pick(FALL), sz = rand(16, 38) | 0, id = 'vcl' + (++leafId);
    const spots = Math.random() < .35 ? Array.from({ length: 2 + (Math.random() * 3 | 0) }, () => `<circle cx="${rand(8, 16).toFixed(1)}" cy="${rand(6, 16).toFixed(1)}" r="${rand(.5, 1.3).toFixed(1)}" fill="#4a2c1a" opacity=".3"/>`).join('') : '';
    // mirror and tilt inside the drawing, so the flutter animation doesn't undo it
    const turn = `translate(12 12) scale(${Math.random() < .5 ? -1 : 1} 1) rotate(${rand(-40, 40) | 0}) translate(-12 -12)`;
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24"><defs><linearGradient id="${id}" x1="${Math.random() < .5 ? 0 : 1}" y1="0" x2="${Math.random() < .5 ? 1 : 0}" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><g transform="${turn}"><path d="${shape}" fill="url(#${id})"/>${spots}<path d="${veins}" fill="none" stroke="#3a2214" stroke-opacity=".28" stroke-width=".7" stroke-linecap="round"/><path d="M12,21 v2.6" stroke="#6b4b33" stroke-width="1.1" stroke-linecap="round"/></g></svg>`;
  };

  // Snow: six-point crystals in different sizes (small ones fall slower, like they're farther away)
  const flake = s => `<svg class="vc-crystal" width="${s}" height="${s}" viewBox="-6 -6 12 12"><g stroke="#ffffff" stroke-width="${s < 12 ? 1.6 : 1.2}" stroke-linecap="round"><path d="M0,-5 V5 M-4.3,-2.5 L4.3,2.5 M-4.3,2.5 L4.3,-2.5 M0,-5 l-1.4,-1.2 M0,-5 l1.4,-1.2 M0,5 l-1.4,1.2 M0,5 l1.4,1.2 M-4.3,-2.5 l-.2,-1.8 M-4.3,-2.5 l-1.7,.6 M4.3,2.5 l.2,1.8 M4.3,2.5 l1.7,-.6 M-4.3,2.5 l-1.7,-.6 M-4.3,2.5 l-.2,1.8 M4.3,-2.5 l1.7,.6 M4.3,-2.5 l.2,-1.8"/></g></svg>`;
  const heart = col => `<svg width="${rand(12, 20) | 0}" height="${rand(12, 20) | 0}" viewBox="3 4 22 21"><path d="M14,24 C4,17 3,11 6,8 C9,5 13,7 14,10 C15,7 19,5 22,8 C25,11 24,17 14,24 Z" fill="${col}"/></svg>`;
  // Easter: cherry blossom petals (notched at the tip) and the odd butterfly
  const petal = col => { const s = rand(11, 20) | 0; return `<svg class="vc-bloom" width="${s}" height="${s}" viewBox="-6 -6 12 12">${[0, 72, 144, 216, 288].map(a => `<ellipse cy="-2.7" rx="1.9" ry="2.8" transform="rotate(${a})" fill="${col}" stroke="#d99aab" stroke-opacity=".6" stroke-width=".35"/>`).join('')}<circle r="1.3" fill="#c9a227"/></svg>`; };
  // Halloween: a witch on her broom (with a cat riding along), little ghosts, a peeking jack-o'-lantern
  const witch = `<svg width="${small ? 120 : 170}" height="${small ? 64 : 90}" viewBox="-8 -14 126 66"><g fill="#1c2233">
    <path d="M8,42 L112,34" stroke="#6b4b33" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M11,41.6 L-5,31 M11,41.8 L-7,37 M11,42 L-7,43.5 M11,42.2 L-5,50 M11,42.4 L0,53" stroke="#c9a227" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M10,39 L13,45" stroke="#7a5a44" stroke-width="2.4"/>
    <ellipse cx="24" cy="35" rx="6" ry="4.6"/><circle cx="29" cy="29.5" r="3.6"/><path d="M26.5,27 L27,22.5 L29,26 Z M30,26 L32,22.5 L32.3,27.5 Z"/>
    <path class="cat-tail" d="M18.5,34 C13,32 13,24 17,22" stroke="#1c2233" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="30.4" cy="29" r=".7" fill="#e9c75a"/>
    <path class="cape" d="M47,24 C37,22 29,27 21,19 C27,33 37,35 48,33 Z" fill="#3a2f4a"/>
    <path d="M44,38 C45,24 52,17 60,17 C66,17 70,23 70,30 L72,38 Z"/>
    <path d="M62,37 L73,45 L80,45.5" stroke="#1c2233" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M62,23 L78,35" stroke="#1c2233" stroke-width="3" stroke-linecap="round"/>
    <circle cx="64" cy="13" r="5.2"/><path d="M68.5,12.5 L73,14.5 L68.5,15.2 Z"/>
    <ellipse cx="65" cy="8.6" rx="11.5" ry="2.3"/><path d="M57,8 L73,8 L70,-6 C72,-9 75,-10 79,-9 C74,-8 72,-6 71,-2 Z"/>
    <rect x="58.5" y="5.6" width="13" height="2.4" fill="#a97c86"/><path d="M75,-8.4 l1,-1.6 l1,1.6 l-1,1.6 Z" fill="#c9a227"/></g></svg>`;
  const ghost = () => { const g = rand(26, 40) | 0; return `<svg class="vc-ghost" width="${g}" height="${g * 1.25 | 0}" viewBox="-14 -16 28 34"><path d="M0,-14 C9,-14 12,-6 12,2 L12,16 L8,12 L4,16 L0,12 L-4,16 L-8,12 L-12,16 L-12,2 C-12,-6 -9,-14 0,-14 Z" fill="#ffffff" fill-opacity=".92" stroke="#c9c3d8" stroke-width=".8"/><ellipse cx="-4" cy="-3" rx="2" ry="2.8" fill="#1c2233"/><ellipse cx="4" cy="-3" rx="2" ry="2.8" fill="#1c2233"/><ellipse cy="5" rx="2.4" ry="3" fill="#1c2233"/><ellipse cx="-7.5" cy="1.5" rx="1.8" ry="1" fill="#e3b3c0" opacity=".7"/><ellipse cx="7.5" cy="1.5" rx="1.8" ry="1" fill="#e3b3c0" opacity=".7"/></svg>`; };
  const jack = `<svg width="64" height="58" viewBox="-32 -30 64 58"><ellipse cx="-11" cy="4" rx="13" ry="16" fill="#b5652c"/><ellipse cx="11" cy="4" rx="13" ry="16" fill="#b5652c"/><ellipse cy="4" rx="12" ry="17" fill="#c97a3c"/>
    <path d="M0,-12 q1,-8 6,-11" stroke="#2f6a64" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <g class="jack-glow" fill="#ffd27a"><path d="M-14,-3 L-6,-3 L-10,-10 Z"/><path d="M6,-3 L14,-3 L10,-10 Z"/><path d="M-2,1 L2,1 L0,-3 Z"/><path d="M-15,7 L-10,9 L-7,6 L-3,10 L0,7 L3,10 L7,6 L10,9 L15,7 C12,16 -12,16 -15,7 Z"/></g></svg>`;

  // Back to school: falling pencils, crayons, letters and an A+ paper, and a school bus along the bottom
  const pencil = () => `<svg width="${rand(34, 46) | 0}" height="11" viewBox="0 0 40 10"><rect x="6" y="1" width="26" height="8" fill="#e0b030"/><path d="M6,3.7 H32 M6,6.3 H32" stroke="#c9961f" stroke-width=".7"/><rect x="31" y="1" width="2.4" height="8" fill="#a0a3a8"/><rect x="33.4" y="1" width="5" height="8" rx="1.6" fill="#e3b3c0"/><path d="M0,5 L6,1 V9 Z" fill="#ead2ab"/><path d="M0,5 L2.3,3.6 V6.4 Z" fill="#1c2233"/></svg>`;
  const crayon = col => `<svg width="${rand(30, 40) | 0}" height="10" viewBox="0 0 36 10"><rect x="6" y="1" width="28" height="8" rx="1.5" fill="${col}"/><rect x="12" y="1" width="14" height="8" fill="#ffffff" opacity=".35"/><path d="M12,1 V9 M26,1 V9" stroke="#00000033" stroke-width=".6"/><path d="M0.5,5 L6,1.6 V8.4 Z" fill="${col}"/></svg>`;
  const letter = (ch, col) => `<svg width="${rand(18, 28) | 0}" height="${rand(18, 28) | 0}" viewBox="0 0 20 20"><text x="10" y="15.5" text-anchor="middle" font-family="'Bodoni Moda',Georgia,serif" font-size="17" font-weight="600" fill="${col}">${ch}</text></svg>`;
  const aplus = `<svg width="30" height="36" viewBox="0 0 30 36"><rect x="1" y="1" width="28" height="34" rx="1.5" fill="#ffffff" stroke="#c9cbd6"/><path d="M6,1 V35" stroke="#e3b3c0" stroke-width=".8"/><path d="M3,9 H27 M3,14 H27 M3,19 H27 M3,24 H27 M3,29 H27" stroke="#9fb0e6" stroke-width=".6"/><text x="16" y="23" text-anchor="middle" font-family="'Bodoni Moda',Georgia,serif" font-size="13" font-weight="600" fill="#d33a3a">A+</text></svg>`;
  const bus = `<svg width="${small ? 110 : 150}" height="${small ? 52 : 70}" viewBox="0 0 120 56">
    <path d="M6,12 Q6,6 12,6 H92 Q100,6 102,14 L104,26 H114 Q118,26 118,32 V44 H6 Z" fill="#e8b420" stroke="#9a7414" stroke-width="1"/>
    <rect x="6" y="30" width="112" height="3" fill="#1c2233" opacity=".8"/><rect x="6" y="37" width="112" height="2" fill="#1c2233" opacity=".55"/>
    ${[12, 28, 44, 60, 76].map(x => `<rect x="${x}" y="11" width="12" height="11" rx="1.5" fill="#cfe0f5" stroke="#9a7414" stroke-width=".6"/>`).join('')}
    <rect x="91" y="11" width="9" height="19" rx="1" fill="#cfe0f5" stroke="#9a7414" stroke-width=".6"/><path d="M95.5,11 V30" stroke="#9a7414" stroke-width=".6"/>
    <rect x="114" y="34" width="5" height="4" rx="1" fill="#ffefb0"/><rect x="5" y="34" width="3" height="4" fill="#d33a3a"/>
    <g class="bus-wheel"><circle cx="26" cy="45" r="7" fill="#1c2233"/><circle cx="26" cy="45" r="2.6" fill="#a0a3a8"/><path d="M26,40 V50 M21,45 H31" stroke="#a0a3a8" stroke-width="1"/></g>
    <g class="bus-wheel"><circle cx="96" cy="45" r="7" fill="#1c2233"/><circle cx="96" cy="45" r="2.6" fill="#a0a3a8"/><path d="M96,40 V50 M91,45 H101" stroke="#a0a3a8" stroke-width="1"/></g>
  </svg>`;

  // Christmas: Santa's sleigh and two reindeer (the lead one with a red nose) flying across the sky
  const reindeer = (x, y, nose) => `<g transform="translate(${x},${y})">
    <path class="rd-legs" d="M-10,4 l-3,10 M-6,4 l2,10 M8,4 l-2,10 M12,4 l3,10" stroke="#5e4433" stroke-width="2" stroke-linecap="round" fill="none"/>
    <ellipse rx="14" ry="6.5" fill="#8a6447"/><circle cx="-14" cy="-3" r="2" fill="#fff"/>
    <path d="M9,-3 L15,-12 L19,-10 L14,0 Z" fill="#8a6447"/><ellipse cx="19" cy="-13" rx="5.5" ry="3.6" fill="#8a6447"/>
    <circle cx="24.3" cy="-13" r="1.7" fill="${nose}"/><circle cx="19.5" cy="-14.2" r=".7" fill="#1c2233"/>
    <path d="M16,-16 l-2,-6 m1,3 l-3,-1 M18.5,-16 l1,-7 m-.5,3 l3,-2" stroke="#5e4433" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>`;
  const sleigh = `<svg width="${small ? 150 : 230}" height="${small ? 42 : 64}" viewBox="0 0 200 56">
    <path d="M58,22 Q92,16 118,21 M120,20 Q140,16 160,19" stroke="#7a5a44" stroke-width=".9" fill="none"/>
    ${reindeer(120, 30, '#5e4433')}${reindeer(163, 26, '#d33a3a')}
    <path d="M18,25 C13,14 27,7 33,16 L34,30 Z" fill="#a97c86"/><path d="M22,12 l4,3" stroke="#7a5a44" stroke-width="1.2"/>
    <ellipse cx="40" cy="26" rx="9" ry="8" fill="#b3262e"/><rect x="31" y="27" width="18" height="2.6" fill="#1c2233"/>
    <circle cx="44" cy="15" r="5" fill="#f1d3c0"/><path d="M39.5,15 C39.5,23.5 48.5,23.5 48.5,15 C46,18.5 42,18.5 39.5,15 Z" fill="#fff"/>
    <path d="M39,12.5 C40,5 48,4 51,9 L48.5,12.5 Z" fill="#b3262e"/><circle cx="52" cy="9" r="1.8" fill="#fff"/><rect x="38.6" y="11.4" width="11" height="2.4" rx="1.2" fill="#fff"/>
    <path d="M46,24 L58,22" stroke="#b3262e" stroke-width="3.2" stroke-linecap="round"/><circle cx="58.5" cy="22" r="1.8" fill="#1c2233"/>
    <path d="M12,30 H58 C62,30 64,26 66,22 C68,27 66,40 56,42 H20 C14,42 11,37 12,30 Z" fill="#b3262e" stroke="#c9a227" stroke-width="1.2"/>
    <path d="M14,48 H60 C66,48 68,44 70,40 M22,42 V48 M50,42 V48" stroke="#c9a227" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </svg>`;
  // Thanksgiving: a turkey that waddles along the bottom and trips now and then
  const walkingTurkey = `<svg width="${small ? 54 : 70}" height="${small ? 58 : 76}" viewBox="-30 -36 60 66"><g>
    ${[-70, -35, 0, 35, 70].map((a, i) => `<ellipse cx="0" cy="-15" rx="6.5" ry="15" transform="rotate(${a})" fill="${['#b5652c', '#c9a227', '#a97c86', '#c9a227', '#b5652c'][i]}"/>`).join('')}
    ${[-52, -17, 17, 52].map((a, i) => `<ellipse cx="0" cy="-12" rx="3" ry="9" transform="rotate(${a})" fill="${['#8f3b2a', '#d9b04a', '#d9b04a', '#8f3b2a'][i]}" opacity=".8"/>`).join('')}
    <path class="tk-leg tk-leg-l" d="M-4,12 v10 l-3,3 M-4,22 l2,3" stroke="#c9a227" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path class="tk-leg tk-leg-r" d="M4,12 v10 l3,3 M4,22 l-2,3" stroke="#c9a227" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <ellipse cy="3" rx="11" ry="12" fill="#7a5a44"/><circle cy="-11" r="5.6" fill="#8a6a52"/>
    <circle cx="-2" cy="-12" r=".9" fill="#1c2233"/><circle cx="2" cy="-12" r=".9" fill="#1c2233"/>
    <path d="M-1.6,-9.6 L1.6,-9.6 L0,-6.8 Z" fill="#c9a227"/><path d="M1.2,-8.6 q2.2,2 .4,4.6" stroke="#b3262e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g></svg>`;
  // Easter bunny with a basket of eggs, hopping across the bottom of the page
  const bunny = `<svg width="78" height="68" viewBox="0 0 64 56"><g stroke="#b9ab9f" stroke-width=".8">
    <circle cx="9.5" cy="35.5" r="5" fill="#ffffff"/>
    <ellipse cx="18" cy="48" rx="9" ry="4.2" fill="#ece5de"/>
    <ellipse cx="24" cy="37.5" rx="14" ry="11" fill="#f1ebe5"/>
    <ellipse cx="35.5" cy="12" rx="3.3" ry="10" transform="rotate(-14 35.5 12)" fill="#f1ebe5"/>
    <ellipse cx="41.5" cy="12.5" rx="3.3" ry="10" transform="rotate(12 41.5 12.5)" fill="#f1ebe5"/>
    <circle cx="38.5" cy="26" r="9" fill="#f1ebe5"/>
    <ellipse cx="35" cy="48" rx="4.5" ry="3" fill="#ece5de"/></g>
    <ellipse cx="35.5" cy="12.5" rx="1.5" ry="7" transform="rotate(-14 35.5 12.5)" fill="#e8b4c2"/>
    <ellipse cx="41.5" cy="13" rx="1.5" ry="7" transform="rotate(12 41.5 13)" fill="#e8b4c2"/>
    <circle cx="41.5" cy="24" r="1.4" fill="#1c2233"/><circle cx="41.9" cy="23.5" r=".4" fill="#fff"/>
    <ellipse cx="47" cy="27.2" rx="1.3" ry="1" fill="#d98a9c"/>
    <path d="M44.5,29.5 q2,1.2 4,0" stroke="#b9ab9f" stroke-width=".6" fill="none"/>
    <ellipse cx="46.5" cy="35.5" rx="2.4" ry="3.2" fill="#f1ebe5" stroke="#b9ab9f" stroke-width=".8"/>
    <path d="M43.5,38 Q53.5,26 61,38" stroke="#7a5a44" stroke-width="1.6" fill="none"/>
    <ellipse cx="47.5" cy="36" rx="3" ry="4" fill="#9fb0e6"/><path d="M44.8,36 l1.3,-1 l1.3,1 l1.3,-1 l1.3,1" stroke="#fff" stroke-width=".7" fill="none"/>
    <ellipse cx="52.5" cy="35" rx="3" ry="4" fill="#e3b3c0"/><path d="M50,35.5 h5" stroke="#fff" stroke-width=".8"/>
    <ellipse cx="57.3" cy="36.2" rx="2.8" ry="3.8" fill="#ead9a6"/><circle cx="56.5" cy="35.5" r=".7" fill="#fff"/><circle cx="58.2" cy="37" r=".6" fill="#fff"/>
    <path d="M42.5,37.5 H62 L59.5,48.5 H45 Z" fill="#b5865a" stroke="#7a5a44" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M43.6,41.2 H61.2 M44.4,44.8 H60.4 M48,37.5 L48.6,48.5 M52.2,37.5 V48.5 M56.4,37.5 L55.8,48.5" stroke="#7a5a44" stroke-opacity=".45" stroke-width=".6"/>
  </svg>`;
  const butterfly = (a, b) => `<svg width="40" height="34" viewBox="-20 -17 40 34"><g class="vc-wing"><path d="M-1,-1 C-6,-15 -19,-14 -17,-4 C-16,1 -8,2 -1,0 Z" fill="${a}"/><path d="M-1,1 C-8,2 -15,6 -12,12 C-9,16 -3,10 -1,2 Z" fill="${b}"/></g><g class="vc-wing vc-wing-r"><path d="M1,-1 C6,-15 19,-14 17,-4 C16,1 8,2 1,0 Z" fill="${a}"/><path d="M1,1 C8,2 15,6 12,12 C9,16 3,10 1,2 Z" fill="${b}"/></g><ellipse rx="1.3" ry="7" fill="${C.ink}" opacity=".75"/><path d="M-.5,-7 q-2,-4 -4,-5 M.5,-7 q2,-4 4,-5" stroke="${C.ink}" stroke-width=".7" fill="none" opacity=".75"/></svg>`;
  const bat = `<svg width="46" height="22" viewBox="-23 -11 46 22"><g fill="${C.ink}" opacity=".78"><path class="vc-wing" d="M-3,0 C-8,-8 -16,-9 -22,-4 C-17,-3 -15,0 -14,3 C-11,1 -8,1 -6,4 Z"/><path class="vc-wing vc-wing-r" d="M3,0 C8,-8 16,-9 22,-4 C17,-3 15,0 14,3 C11,1 8,1 6,4 Z"/><ellipse rx="3.6" ry="4.4"/><path d="M-2.6,-3.4 L-3.6,-7 L-1,-4.4 Z M2.6,-3.4 L3.6,-7 L1,-4.4 Z"/></g></svg>`;
  const plane = `<svg width="54" height="30" viewBox="0 0 54 30"><path d="M2,15 L52,2 L30,28 L24,18 Z" fill="#fff" stroke="${C.blue}" stroke-width="1.4" stroke-linejoin="round"/><path d="M24,18 L52,2" stroke="${C.blue}" stroke-width="1.2"/></svg>`;

  // Fireworks for the 4th of July: rockets rise with a trail, then burst into streaking sparks
  // in red, blue and gold with a little white glitter. Drawn in batches (one stroke per color and
  // brightness) with no blur, and the loop sleeps when nothing is in the air, so it stays smooth.
  function fireworks() {
    const cv = document.createElement('canvas');
    cv.className = 'vc-canvas';
    layer.appendChild(cv);
    const ctx = cv.getContext('2d');
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    size();
    const onResize = () => size();
    addEventListener('resize', onResize);
    const COLS = ['#d33a3a', '#3a56c9', '#e0b030', '#c2185b'];
    const rockets = [], sparks = [], MAX = small ? 160 : 260;
    let running = false;
    function launch() {
      if (!cv.isConnected) { removeEventListener('resize', onResize); return; }
      rockets.push({ x: rand(.12, .88) * cv.width, y: cv.height, vy: -rand(9, 12) * dpr, top: rand(.14, .45) * cv.height, col: pick(COLS) });
      if (Math.random() < .3) later(launch, 280);
      wake();
    }
    function burst(x, y, col) {
      const count = Math.min(small ? 34 : 52, MAX - sparks.length);
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + rand(-.06, .06), v = rand(2.2, 5) * dpr;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, fade: rand(.012, .018), col: Math.random() < .12 ? '#f3e2a6' : col });
      }
    }
    function wake() { if (!running) { running = true; requestAnimationFrame(tick); } }
    function tick() {
      if (!cv.isConnected) { running = false; return; }
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineCap = 'round';
      if (rockets.length) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#e0b030'; ctx.lineWidth = 2.4 * dpr; ctx.beginPath();
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i];
          ctx.moveTo(r.x, r.y + 16 * dpr);
          r.y += r.vy; r.vy += .09 * dpr;
          ctx.lineTo(r.x, r.y);
          if (r.y <= r.top || r.vy >= -1.5 * dpr) { burst(r.x, r.y, r.col); rockets.splice(i, 1); }
        }
        ctx.stroke();
      }
      // group sparks by color and brightness so each group is one stroke
      const groups = new Map();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy; p.vy += .05 * dpr; p.vx *= .982; p.vy *= .982; p.life -= p.fade;
        if (p.life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
        const key = p.col + (Math.ceil(p.life * 4));
        let g = groups.get(key);
        if (!g) groups.set(key, g = { col: p.col, alpha: Math.ceil(p.life * 4) / 4, list: [] });
        g.list.push(p);
      }
      ctx.lineWidth = 3 * dpr;
      for (const g of groups.values()) {
        ctx.globalAlpha = g.alpha; ctx.strokeStyle = g.col; ctx.beginPath();
        for (const p of g.list) { ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4); ctx.lineTo(p.x, p.y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (rockets.length || sparks.length) requestAnimationFrame(tick);
      else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    every(launch, ms(small ? 1900 : 1300));
    launch();
  }
  function start() {
    layer = document.createElement('div');
    layer.className = 'vc-fx vc-fx-' + kind;
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);
    band.classList.add('animate');

    if (kind === 'christmas') {
      const sleighRide = () => fly(sleigh, { y: [18, 32], dur: [small ? 9 : 13, small ? 11 : 17], cls: 'vc-sleigh', rtl: false });
      later(sleighRide, 2500); every(sleighRide, ms(26000));
      for (let i = 0; i < n(small ? 26 : 50); i++) {
        const size = rand(7, 24) | 0;
        piece(flake(size), { dur: size < 12 ? [13, 18] : [8, 12], delay: [0, 16] });
      }
    } else if (kind === 'thanksgiving') {
      for (let i = 0; i < n(small ? 12 : 22); i++) {
        const p = piece(leaf(), { dur: [7, 14], delay: [0, 14], cls: 'vc-tumble' });
        // each leaf flutters at its own pace and direction
        const svg = p.querySelector('svg'); svg.parentElement.style.setProperty('--tumble', rand(1.8, 3.8).toFixed(2) + 's');
        if (Math.random() < .5) svg.parentElement.classList.add('vc-rev');
      }
      const strut = () => fly(walkingTurkey, { y: [small ? 82 : 79, small ? 85 : 82], dur: [small ? 14 : 20, small ? 17 : 25], cls: 'vc-walker' });
      later(strut, 1500); every(strut, ms(28000));
      // a gust of wind now and then pushes the leaves sideways
      every(() => { layer.classList.add('vc-gust'); setTimeout(() => layer.classList.remove('vc-gust'), 2600); }, ms(14000));
    } else if (kind === 'halloween') {
      const bats = () => { const n = 2 + (Math.random() * 4 | 0), rtl = Math.random() < .5, y = rand(10, 45); for (let i = 0; i < n; i++) later(() => fly(bat, { y: [y - 5, y + 10], dur: [5, 8], cls: 'vc-bat', rtl }), i * 380); };
      later(bats, 800); every(bats, ms(7000));
      const broom = () => fly(witch, { y: [16, 34], dur: [small ? 8 : 11, small ? 10 : 14], cls: 'vc-witch' });
      later(broom, 3500); every(broom, ms(21000));
      for (let i = 0; i < n(small ? 3 : 5); i++) piece(ghost(), { up: true, dur: [14, 22], delay: [0, 22], cls: 'vc-ghostly' });
      const pumpkin = document.createElement('span');
      pumpkin.className = 'vc-jack';
      pumpkin.innerHTML = jack;
      layer.appendChild(pumpkin);
      const spider = document.createElement('span');
      spider.className = 'vc-spider';
      spider.innerHTML = `<span class="vc-thread"></span><svg width="22" height="20" viewBox="-11 -10 22 20"><g stroke="${C.ink}" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M-3,-1 L-9,-6 M-3,1 L-10,0 M-3,2 L-9,6 M3,-1 L9,-6 M3,1 L10,0 M3,2 L9,6"/></g><ellipse cy="1" rx="4" ry="5" fill="${C.ink}"/><circle cy="-4" r="2.6" fill="${C.ink}"/></svg>`;
      layer.appendChild(spider);
    } else if (kind === 'valentines') {
      for (let i = 0; i < n(small ? 10 : 18); i++) piece(heart(pick([C.mauve, C.pink, '#c96f86'])), { up: true, dur: [10, 16], delay: [0, 16] });
    } else if (kind === 'easter') {
      for (let i = 0; i < n(small ? 14 : 26); i++) piece(petal(pick(['#f6d6de', '#f0c3cf', '#fbeaef', '#e8b4c2', '#ffffff'])), { dur: [10, 16], delay: [0, 16] });
      const flutter = () => { const [a, b] = pick([[C.sky, C.mauve], [C.pink, C.gold], [C.mint, C.sky], [C.cream, C.pink]]); fly(butterfly(a, b), { y: [15, 60], dur: [9, 13], cls: 'vc-butterfly' }); };
      later(flutter, 2500); every(flutter, ms(12000));
      const hopAcross = () => fly(bunny, { y: [small ? 80 : 78, small ? 84 : 82], dur: [small ? 9 : 12, small ? 11 : 15], cls: 'vc-bunny', rtl: false });
      later(hopAcross, 1000); every(hopAcross, ms(18000));
    } else if (kind === 'july4') {
      fireworks();
    } else if (kind === 'backtoschool') {
      const go = () => { fly(plane, { y: [12, 55], dur: [8, 11], cls: 'vc-plane', rtl: false }); if (Math.random() < .4) later(() => fly(plane, { y: [20, 60], dur: [9, 12], cls: 'vc-plane', rtl: true }), 1800); };
      later(go, 1200); every(go, ms(9000));
      const supply = () => { const r = Math.random(); return r < .3 ? pencil() : r < .6 ? crayon(pick([C.blue, '#d33a3a', C.green, C.mauve, C.gold])) : r < .9 ? letter(pick(['A', 'B', 'C', '1', '2', '3']), pick([C.blue, '#d33a3a', C.green, C.mauve])) : aplus; };
      for (let i = 0; i < n(small ? 10 : 18); i++) piece(supply(), { dur: [9, 15], delay: [0, 15], cls: 'vc-tumble' });
      const drive = () => fly(bus, { y: [small ? 82 : 79, small ? 84 : 81], dur: [small ? 9 : 12, small ? 11 : 15], cls: 'vc-bus', rtl: false });
      later(drive, 2500); every(drive, ms(20000));
    }
  }
  function stop() {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    timers = [];
    if (layer) layer.remove();
    layer = null;
    band.classList.remove('animate');
  }
  function set(next) {
    on = next;
    if (!opts.manual) { try { localStorage.setItem('vc-anim', on ? 'on' : 'off'); } catch (e) {} }
    stop();
    if (btn) { btn.setAttribute('aria-pressed', String(!on)); btn.textContent = on ? 'Pause animation' : 'Play animation'; }
    on ? start() : stop();
  }
  if (btn) btn.addEventListener('click', () => set(!on));
  // Save battery: stop while the tab is hidden
  document.addEventListener('visibilitychange', () => { if (!on) return; stop(); if (!document.hidden) start(); });
  if (!opts.manual) set(on);
  return { start, stop, set };
}
window.VCSeasonFX = makeFX;
const band = document.querySelector('.season[data-effect]');
if (band && !band.dataset.manual) makeFX(band);
})();
