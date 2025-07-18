document.getElementById('checkout-btn')?.addEventListener('click', async () => {
  const cartItems = Array.from(document.querySelectorAll('.cart-item')).map(item => {
    return {
      name: item.querySelector('h2').textContent,
      price: parseFloat(item.querySelector('p').textContent.replace('Price: $', '')),
      quantity: parseInt(item.querySelector('.qty-display').textContent),
    };
  });

  const subtotal = Math.round(
    cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0) * 100
  );

  try {
    const res = await fetch('/checkout/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: cartItems, subtotal })
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