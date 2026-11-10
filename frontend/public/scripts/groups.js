// Group orders: pick a design and color, enter sizes, see the price drop live.
(function () {
  const $ = s => document.querySelector(s);
  const data = JSON.parse($('#groupData').textContent);
  const money = n => '$' + n.toFixed(2);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const design = () => data.designs.find(d => d.id === $('#gDesign').value) || data.designs[0];
  const qty = {};
  let inCart = data.cartCount || 0;

  function build() {
    const d = design();
    // Colors and sizes come from the chosen design
    $('#gColors').innerHTML = d.colors.map((c, i) => `<button type="button" class="sw" style="background:${esc(c.h)}" aria-label="${esc(c.n)}" aria-pressed="${i === 0}" data-v="${esc(c.n)}"></button>`).join('');
    $('#colorIn').value = d.colors[0]?.n || ''; $('#colorName').textContent = d.colors[0]?.n || '';
    $('#qty').innerHTML = d.sizes.map(s => `<label for="q${esc(s)}">${esc(s)}<input id="q${esc(s)}" type="number" min="0" max="500" inputmode="numeric" name="sizes[${esc(s)}]" value="${qty[s] || 0}" data-s="${esc(s)}"></label>`).join('');
    // Custom shirts get their details for the whole group (only The Original has the four things)
    $('#gMission').hidden = !d.style;
    $('#gThings').hidden = !(d.style && d.style.things);
    if (d.style) {
      $('#gNameLbl').textContent = d.style.nameLabel + ' for every shirt';
      $('#gPlaceLbl').textContent = d.style.placeLabel;
      $('#gMissionName').placeholder = d.style.namePh;
      $('#gPlace').placeholder = d.style.placePh;
    }
    $('#gMission').querySelectorAll('input').forEach(i => i.disabled = !d.style || (i.name.startsWith('things') && !d.style.things));
    calc();
  }
  function calc() {
    const d = design();
    const n = d.sizes.reduce((a, s) => a + (qty[s] || 0), 0);
    const all = n + inCart;   // the discount counts every shirt in the cart
    const tier = [...data.tiers].reverse().find(t => all >= t.min) || data.tiers[0];
    const each = d.price * (1 - tier.off), total = each * n;
    document.querySelectorAll('#tiers div').forEach(el => el.classList.toggle('on', n > 0 && +el.dataset.min === tier.min));
    $('#gN').textContent = n;
    $('#gEach').textContent = money(n ? each : d.price);
    const next = data.tiers.find(t => t.min > all);
    $('#gSave').textContent = tier.off && n ? `${Math.round(tier.off * 100)}% off · you save ${money(d.price * n - total)}`
      : next && n ? `Add ${next.min - all} more for ${Math.round(next.off * 100)}% off` : 'None yet';
    $('#gTotal').textContent = money(total);
    $('#gShip').textContent = n ? (total >= data.freeShippingOver ? 'Ships free' : 'Shipping added at checkout') : 'Add shirts to see shipping';
    $('#gAdd').disabled = !n;
  }
  $('#gDesign').addEventListener('change', build);
  $('#qty').addEventListener('input', e => {
    const s = e.target.dataset.s; if (!s) return;
    qty[s] = Math.max(0, Math.min(500, parseInt(e.target.value) || 0)); calc();
  });
  $('#groupForm').addEventListener('vc:added', e => {
    inCart = e.detail.cart ? e.detail.cart.count : inCart;
    Object.keys(qty).forEach(k => qty[k] = 0); build();
  });
  build();
})();
