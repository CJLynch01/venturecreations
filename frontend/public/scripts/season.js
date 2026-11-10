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
  const petal = col => { const s = rand(9, 16) | 0; return `<svg width="${s}" height="${s}" viewBox="-5 -6.5 10 13"><path d="M0,-4.3 C1,-6.2 3.7,-6 4.1,-3 C4.5,1 2.1,5 0,6.2 C-2.1,5 -4.5,1 -4.1,-3 C-3.7,-6 -1,-6.2 0,-4.3 Z" fill="${col}" stroke="#d99aab" stroke-opacity=".5" stroke-width=".5"/><path d="M0,5 V-1.5" stroke="#d99aab" stroke-opacity=".45" stroke-width=".5"/></svg>`; };
  const butterfly = (a, b) => `<svg width="40" height="34" viewBox="-20 -17 40 34"><g class="vc-wing"><path d="M-1,-1 C-6,-15 -19,-14 -17,-4 C-16,1 -8,2 -1,0 Z" fill="${a}"/><path d="M-1,1 C-8,2 -15,6 -12,12 C-9,16 -3,10 -1,2 Z" fill="${b}"/></g><g class="vc-wing vc-wing-r"><path d="M1,-1 C6,-15 19,-14 17,-4 C16,1 8,2 1,0 Z" fill="${a}"/><path d="M1,1 C8,2 15,6 12,12 C9,16 3,10 1,2 Z" fill="${b}"/></g><ellipse rx="1.3" ry="7" fill="${C.ink}" opacity=".75"/><path d="M-.5,-7 q-2,-4 -4,-5 M.5,-7 q2,-4 4,-5" stroke="${C.ink}" stroke-width=".7" fill="none" opacity=".75"/></svg>`;
  const bat = `<svg width="46" height="22" viewBox="-23 -11 46 22"><g fill="${C.ink}" opacity=".78"><path class="vc-wing" d="M-3,0 C-8,-8 -16,-9 -22,-4 C-17,-3 -15,0 -14,3 C-11,1 -8,1 -6,4 Z"/><path class="vc-wing vc-wing-r" d="M3,0 C8,-8 16,-9 22,-4 C17,-3 15,0 14,3 C11,1 8,1 6,4 Z"/><ellipse rx="3.6" ry="4.4"/><path d="M-2.6,-3.4 L-3.6,-7 L-1,-4.4 Z M2.6,-3.4 L3.6,-7 L1,-4.4 Z"/></g></svg>`;
  const plane = `<svg width="54" height="30" viewBox="0 0 54 30"><path d="M2,15 L52,2 L30,28 L24,18 Z" fill="#fff" stroke="${C.blue}" stroke-width="1.4" stroke-linejoin="round"/><path d="M24,18 L52,2" stroke="${C.blue}" stroke-width="1.2"/></svg>`;

  // Fireworks for the 4th of July: a canvas over the top of the page, small bursts in the site's colors
  function fireworks() {
    const cv = document.createElement('canvas');
    cv.className = 'vc-canvas';
    layer.appendChild(cv);
    const ctx = cv.getContext('2d');
    const size = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * .6 * devicePixelRatio; };
    size(); addEventListener('resize', size);
    const sparks = [];
    function burst() {
      const x = rand(.1, .9) * cv.width, y = rand(.12, .5) * cv.height, col = pick([C.blue, C.mauve, C.gold, '#b3262e']);
      for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, v = rand(1.4, 3.2) * devicePixelRatio; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col }); }
    }
    every(burst, ms(small ? 2200 : 1400));
    burst();
    (function tick() {
      if (!cv.isConnected) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.vy += .035 * devicePixelRatio; s.vx *= .985; s.life -= .012;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = s.life; ctx.fillStyle = s.col;
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.8 * devicePixelRatio, 0, 7); ctx.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  function start() {
    layer = document.createElement('div');
    layer.className = 'vc-fx vc-fx-' + kind;
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);
    band.classList.add('animate');

    if (kind === 'christmas') {
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
      // a gust of wind now and then pushes the leaves sideways
      every(() => { layer.classList.add('vc-gust'); setTimeout(() => layer.classList.remove('vc-gust'), 2600); }, ms(14000));
    } else if (kind === 'halloween') {
      const bats = () => { const n = 1 + (Math.random() * 3 | 0), rtl = Math.random() < .5, y = rand(8, 40); for (let i = 0; i < n; i++) later(() => fly(bat, { y: [y - 4, y + 8], dur: [6, 9], cls: 'vc-bat', rtl }), i * 450); };
      later(bats, 1200); every(bats, ms(11000));
      const spider = document.createElement('span');
      spider.className = 'vc-spider';
      spider.innerHTML = `<span class="vc-thread"></span><svg width="22" height="20" viewBox="-11 -10 22 20"><g stroke="${C.ink}" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M-3,-1 L-9,-6 M-3,1 L-10,0 M-3,2 L-9,6 M3,-1 L9,-6 M3,1 L10,0 M3,2 L9,6"/></g><ellipse cy="1" rx="4" ry="5" fill="${C.ink}"/><circle cy="-4" r="2.6" fill="${C.ink}"/></svg>`;
      layer.appendChild(spider);
    } else if (kind === 'valentines') {
      for (let i = 0; i < n(small ? 10 : 18); i++) piece(heart(pick([C.mauve, C.pink, '#c96f86'])), { up: true, dur: [10, 16], delay: [0, 16] });
    } else if (kind === 'easter') {
      for (let i = 0; i < n(small ? 14 : 26); i++) piece(petal(pick(['#f6d6de', '#f0c3cf', '#fbeaef', '#e8b4c2', '#ffffff'])), { dur: [10, 16], delay: [0, 16], cls: 'vc-tumble' });
      const flutter = () => { const [a, b] = pick([[C.sky, C.mauve], [C.pink, C.gold], [C.mint, C.sky], [C.cream, C.pink]]); fly(butterfly(a, b), { y: [15, 60], dur: [9, 13], cls: 'vc-butterfly' }); };
      later(flutter, 2500); every(flutter, ms(12000));
    } else if (kind === 'july4') {
      fireworks();
    } else if (kind === 'backtoschool') {
      const go = () => fly(plane, { y: [10, 50], dur: [9, 12], cls: 'vc-plane', rtl: false });
      later(go, 1500); every(go, ms(16000));
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
