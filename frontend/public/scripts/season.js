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

  const leaf = col => `<svg width="${rand(15, 24) | 0}" height="${rand(15, 24) | 0}" viewBox="-6 -1 12 13"><path d="M0,0 C4,2 5,7 0,11 C-5,7 -4,2 0,0 Z" fill="${col}"/><path d="M0,1 V10" stroke="#00000033" stroke-width=".6"/></svg>`;
  // Snow: mostly soft white dots (no outline), with a few six-point crystals
  const flake = s => Math.random() < .25
    ? `<svg class="vc-crystal" width="${s + 6}" height="${s + 6}" viewBox="-6 -6 12 12"><g stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"><path d="M0,-5 V5 M-4.3,-2.5 L4.3,2.5 M-4.3,2.5 L4.3,-2.5 M0,-5 l-1.4,-1.2 M0,-5 l1.4,-1.2 M0,5 l-1.4,1.2 M0,5 l1.4,1.2"/></g></svg>`
    : `<span class="vc-snow" style="width:${s}px;height:${s}px"></span>`;
  const heart = col => `<svg width="${rand(12, 20) | 0}" height="${rand(12, 20) | 0}" viewBox="3 4 22 21"><path d="M14,24 C4,17 3,11 6,8 C9,5 13,7 14,10 C15,7 19,5 22,8 C25,11 24,17 14,24 Z" fill="${col}"/></svg>`;
  const petal = col => `<svg width="${rand(10, 15) | 0}" height="${rand(10, 15) | 0}" viewBox="-5 -6 10 12"><ellipse rx="3.6" ry="5.4" fill="${col}"/></svg>`;
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
      for (let i = 0; i < n(small ? 26 : 50); i++) piece(flake(rand(5, 13) | 0), { dur: [9, 16], delay: [0, 16] });
    } else if (kind === 'thanksgiving') {
      for (let i = 0; i < n(small ? 12 : 22); i++) piece(leaf(pick([C.rust, C.gold, C.mauve, C.brown])), { dur: [8, 13], delay: [0, 13], cls: 'vc-tumble' });
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
      for (let i = 0; i < n(small ? 12 : 22); i++) piece(petal(pick([C.pink, C.sky, C.mint, C.cream])), { dur: [10, 15], delay: [0, 15], cls: 'vc-tumble' });
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
