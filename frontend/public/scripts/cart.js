async function checkout(items) {
  const res = await fetch('/checkout/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  window.location.href = data.url;
}