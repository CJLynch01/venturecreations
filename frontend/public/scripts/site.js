// Every page: mobile menu, option pickers, product photos, add-to-cart without leaving the page, slide-in cart.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const money = n => '$' + Number(n).toFixed(2);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Toast
  function toast(text) {
    const t = $('#toast'); if (!t) return;
    t.textContent = text; t.classList.add('on');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('on'), 2400);
  }
  window.VCToast = toast;

  // Mobile menu
  const menuBtn = $('#menuBtn'), nav = $('#mainNav');
  if (menuBtn && nav) menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', open);
  });

  // Option pickers: <div data-pick="size"> buttons fill the hidden input #sizeIn
  document.querySelectorAll('[data-pick]').forEach(group => {
    group.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      group.querySelectorAll('button[data-v]').forEach(x => x.setAttribute('aria-pressed', x === b));
      const key = group.dataset.pick, input = document.getElementById(key + 'In');
      if (input) { input.value = b.dataset.v; input.dispatchEvent(new Event('change', { bubbles: true })); }
      const label = document.getElementById(key + 'Name'); if (label) label.textContent = b.dataset.v;
      const msg = $('#buyMsg'); if (msg) msg.textContent = '';
    });
  });

  // Product photos
  const thumbs = $('#thumbs');
  if (thumbs) thumbs.addEventListener('click', e => {
    const b = e.target.closest('button[data-src]'); if (!b) return;
    $('#mainImg').src = b.dataset.src;
    thumbs.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  });

  // Slide-in cart
  const drawer = $('#drawer'), scrim = $('#scrim');
  function renderDrawer(c) {
    if (!drawer || !c) return;
    $('#cartN').textContent = c.count;
    $('#drawerBody').innerHTML = c.lines.length ? c.lines.map(l => `<div class="ci"><img src="${esc(l.image)}" alt="">
        <div><b>${esc(l.name)}</b><small>${esc([l.size, l.color].filter(Boolean).join(' · '))}</small>
        ${l.custom ? `<small>${esc(l.custom.mission)}${l.custom.place ? ' · ' + esc(l.custom.place) : ''}</small>${l.custom.things && l.custom.things.length ? `<small>${esc(l.custom.things.join(' · '))}</small>` : ''}` : ''}
        <small class="tabnum">${l.quantity} × ${money(l.each)}</small></div>
        <div class="r"><b class="tabnum">${money(l.total)}</b><button class="linkbtn" type="button" data-remove="${esc(l.id)}">Remove</button></div></div>`).join('')
      : '<p class="empty">Your cart is empty.</p>';
    $('#drawerSub').textContent = money(c.subtotal);
    $('#drawerSaveRow').hidden = !c.discount;
    if (c.discount) { $('#drawerSaveLbl').textContent = `Group discount (${Math.round(c.off * 100)}%)`; $('#drawerSave').textContent = '−' + money(c.discount); }
    const over = (window.VC && VC.freeShippingOver) || 100;
    $('#drawerShip').innerHTML = !c.count ? `Free shipping on orders over <b>$${over}</b>.`
      : c.toFreeShipping > 0 ? `You're <b class="tabnum">${money(c.toFreeShipping)}</b> away from free shipping.` : '<b>Free shipping unlocked.</b>';
    if (c.nextTier && c.count) $('#drawerShip').innerHTML += ` Add <b>${c.nextTier.need}</b> more shirt${c.nextTier.need > 1 ? 's' : ''} for ${Math.round(c.nextTier.off * 100)}% off.`;
    $('#drawerBar').style.width = Math.min(100, (c.afterDiscount / over) * 100) + '%';
  }
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false'); $('#drawerX').focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true');
  }
  async function api(url, body) {
    const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Accept': 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong. Please try again.');
    return data;
  }
  window.VCCart = { open: openDrawer, render: renderDrawer, api };
  if (drawer) {
    scrim.addEventListener('click', closeDrawer);
    $('#drawerX').addEventListener('click', closeDrawer);
    addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    $('#drawerBody').addEventListener('click', async e => {
      const b = e.target.closest('[data-remove]'); if (!b) return;
      try { const d = await api('/cart/remove', { lineId: b.dataset.remove }); renderDrawer(d.cart); } catch (err) { toast(err.message); }
    });
    const cartBtn = $('#cartBtn');
    if (cartBtn && location.pathname !== '/cart') cartBtn.addEventListener('click', async e => {
      e.preventDefault();
      try { renderDrawer(await api('/cart')); openDrawer(); } catch (err) { location.href = '/cart'; }
    });
  }

  // Add-to-cart forms stay on the page and open the cart
  document.querySelectorAll('form[data-cart-form]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('#buyMsg', document);
      const size = form.querySelector('#sizeIn');
      if (size && !size.value && form.querySelector('[data-pick="size"]')) { if (msg) msg.textContent = 'Choose a size first.'; return; }
      const fd = new FormData(form), body = {};
      for (const [k, v] of fd.entries()) {
        const m = k.match(/^(\w+)\[(\w+)\]$/);
        if (m) (body[m[1]] = body[m[1]] || {})[m[2]] = v; else body[k] = v;
      }
      const btns = form.querySelectorAll('[type=submit]'), outside = document.querySelectorAll(`[form="${form.id}"]`);
      [...btns, ...outside].forEach(b => b.disabled = true);
      try {
        const d = await api(form.action, body);
        renderDrawer(d.cart); openDrawer(); toast(d.message || 'Added to cart');
        form.dispatchEvent(new CustomEvent('vc:added', { detail: d }));
      } catch (err) { if (msg) msg.textContent = err.message; else toast(err.message); }
      finally { [...btns, ...outside].forEach(b => b.disabled = false); }
    });
  });

  // Cart page checkout
  const checkout = $('#checkoutBtn');
  if (checkout) checkout.addEventListener('click', async () => {
    const msg = $('#checkoutMsg'); checkout.disabled = true; if (msg) msg.textContent = '';
    try {
      const res = await fetch('/checkout/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (data.url) { location.href = data.url; return; }
      throw new Error(data.error || 'Checkout could not start. Please try again.');
    } catch (err) { if (msg) msg.textContent = err.message; checkout.disabled = false; }
  });
})();
