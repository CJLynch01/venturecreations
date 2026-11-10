// A short seasonal drift when a page opens: leaves at Thanksgiving, snow at Christmas.
// About 15 seconds, then it fades. On the home page every time, elsewhere once per visit.
// Skipped for people whose device asks for less motion.
(function () {
  const band = document.querySelector('.season[data-fall]');
  if (!band || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const kind = band.dataset.fall;
  const home = location.pathname === '/';
  let seen = false;
  try { seen = sessionStorage.getItem('vc-fall') === kind; sessionStorage.setItem('vc-fall', kind); } catch (e) {}
  if (!home && seen) return;

  const LEAF = ['#b5652c', '#c9a227', '#a97c86', '#7a5a44'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const layer = document.createElement('div');
  layer.className = 'vc-fall';
  layer.setAttribute('aria-hidden', 'true');
  const count = kind === 'snow' ? (innerWidth < 600 ? 22 : 40) : (innerWidth < 600 ? 10 : 18);
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('span');
    const sway = document.createElement('span');
    const size = kind === 'snow' ? rand(5, 11) : rand(14, 22);
    drop.className = 'vc-flake';
    drop.style.left = rand(0, 100) + 'vw';
    drop.style.animationDuration = rand(kind === 'snow' ? 8 : 7, kind === 'snow' ? 14 : 11) + 's';
    drop.style.animationDelay = rand(0, 6) + 's';
    sway.className = 'vc-sway';
    sway.style.animationDuration = rand(2.5, 4.5) + 's';
    sway.innerHTML = kind === 'snow'
      ? `<svg width="${size}" height="${size}" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" fill="#ffffff" stroke="#aeb9d8" stroke-width=".8"/></svg>`
      : `<svg width="${size}" height="${size}" viewBox="-6 -1 12 13" style="transform:rotate(${rand(-60, 60)}deg)"><path d="M0,0 C4,2 5,7 0,11 C-5,7 -4,2 0,0 Z" fill="${LEAF[i % 4]}"/><path d="M0,1 V10" stroke="#00000033" stroke-width=".6"/></svg>`;
    drop.appendChild(sway);
    layer.appendChild(drop);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.classList.add('done'), 15000);
  setTimeout(() => layer.remove(), 17500);
})();
