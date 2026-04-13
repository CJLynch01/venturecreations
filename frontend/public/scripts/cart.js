document.getElementById('checkout-btn')?.addEventListener('click', async () => {
  const cartItems = Array.from(document.querySelectorAll('.cart-item')).map(item => {
    return {
      productId: item.dataset.productId,
      quantity: parseInt(item.querySelector('.qty-display').textContent),
    };
  });

  try {
    const res = await fetch('/checkout/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: cartItems })
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Something went wrong during checkout.');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Error creating Stripe session.');
  }
});