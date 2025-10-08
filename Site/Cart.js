document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.user_id) {
    window.location.href = "login.html";
    return;
  }

  const userId = user.user_id;
  const cartContainer = document.getElementById("cart-items");
  const totalDisplay = document.querySelectorAll("#cart-total, #cart-total-final");
  const checkoutBtn = document.getElementById("checkout-btn");
  const cartSummary = document.getElementById('cart-summary');

  // 🔄 Автоматичне оновлення кошика
  setInterval(loadCart, 3000);

  // 🔹 Завантажити кошик при старті
  await loadCart();
  // Якщо кошик порожній після першого load — приховаємо підсумок і кнопку
  const initialRows = document.querySelectorAll('.cart-item');
  if (!initialRows || initialRows.length === 0) {
    if (cartSummary) cartSummary.style.display = 'none';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
  }
  // --- Подія на контейнері (делегація) та на кнопку оформлення реєструються ОДИН РАЗ
  // Використовуємо делегацію, щоб не підписуватись на кожен елемент при кожному завантаженні
  cartContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest('.remove-btn');
    if (!btn) return;
    e.preventDefault();
    const productId = btn.dataset.id;

    try {
      await fetch(`http://localhost:5000/cart/${userId}/${productId}`, { method: "DELETE" });
      const itemRow = btn.closest('.cart-item');
      if (itemRow) itemRow.remove();
      updateTotal();
    } catch (err) {
      console.error('Помилка при видаленні товару:', err);
      alert('Не вдалося видалити товар');
    }
  });

  cartContainer.addEventListener('change', async (e) => {
    const input = e.target;
    if (!input.classList.contains('item-qty')) return;
    const productId = input.dataset.id;
    const newQty = parseInt(input.value);

    try {
      const res = await fetch(`http://localhost:5000/cart/${userId}/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty })
      });

      const data = await res.json();
      if (res.ok) {
        updateTotal();
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (err) {
      console.error('Помилка при оновленні кількості:', err);
      alert('Не вдалося оновити кількість');
    }
  });

  async function loadCart() {
    try {
      const res = await fetch(`http://localhost:5000/cart/${userId}?t=${Date.now()}`);
      const items = await res.json();

      if (!Array.isArray(items) || items.length === 0 || items.empty) {
        showEmptyCart(items.message);
        if (cartSummary) cartSummary.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
      }

      cartContainer.innerHTML = "";
      let total = 0;

      items.forEach(item => {
        const photo = item.photo?.split(',')[0]?.trim() || `img/${item.product_id}.jpg`;
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const row = document.createElement("div");
        row.className = "row align-items-center border-bottom py-3 cart-item";
        row.innerHTML = `
          <div class="col-md-2">
            <img src="${photo}" class="img-fluid rounded" alt="${item.name}">
          </div>
          <div class="col-md-6">
            <h5>${item.name}</h5>
            <p class="mb-1 item-price">Ціна: <strong>${item.price} грн</strong></p>
            <a href="#" class="text-danger remove-btn" data-id="${item.product_id}">Видалити</a>
          </div>
          <div class="col-md-2">
            <input type="number" class="form-control item-qty" value="${item.quantity}" min="1" max="${item.stock}" data-id="${item.product_id}">
          </div>
          <div class="col-md-2 text-end item-subtotal">${subtotal} грн</div>
        `;
        cartContainer.appendChild(row);
      });

      totalDisplay.forEach(el => el.textContent = total + " грн");
      // Показуємо підсумок і кнопку, якщо є товари
      if (cartSummary) cartSummary.style.display = '';
      if (checkoutBtn) checkoutBtn.style.display = '';
    } catch (error) {
      console.error("❌ Помилка завантаження кошика:", error);
      showEmptyCart("Не вдалося завантажити товари");
      if (cartSummary) cartSummary.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
    }
  }
  // Реєструємо обробник оформлення замовлення ОДИН РАЗ
  checkoutBtn.addEventListener("click", async () => {
    const orderItems = [];

    document.querySelectorAll(".cart-item").forEach(row => {
      const productId = row.querySelector(".remove-btn").dataset.id;
      const quantity = parseInt(row.querySelector(".item-qty").value);
      orderItems.push({ product_id: productId, quantity });
    });

    if (orderItems.length === 0) {
      alert("Кошик порожній");
      return;
    }

    try {
        // Блокуємо кнопку, щоб уникнути подвійного кліку
        checkoutBtn.disabled = true;

        const res = await fetch("http://localhost:5000/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, items: orderItems })
      });

      const data = await res.json();

      if (res.ok) {
        // Спробуємо очистити кошик на сервері (якщо бекенд підтримує)
        try {
          await fetch(`http://localhost:5000/cart/${userId}`, { method: 'DELETE' });
        } catch (clearErr) {
          console.warn('Не вдалося очистити кошик на сервері:', clearErr);
          // не перериваємо процес оформлення — користувач вже оформив замовлення
        }

        // Оновлюємо інтерфейс
        cartContainer.innerHTML = "";
        totalDisplay.forEach(el => el.textContent = "0 грн");
        alert("Замовлення оформлено!");
        // Перенаправляємо користувача до сторінки з його замовленнями
        window.location.href = "my_order.html";
      } else {
        alert("Помилка: " + data.error);
      }
      } catch (error) {
      console.error("❌ Помилка оформлення:", error);
      alert("Не вдалося оформити замовлення");
      checkoutBtn.disabled = false;
    }
  });

  function updateTotal() {
    let total = 0;
    const rows = document.querySelectorAll(".cart-item");

    rows.forEach(row => {
      const priceText = row.querySelector(".item-price").textContent;
      const quantityInput = row.querySelector(".item-qty");
      const subtotalCell = row.querySelector(".item-subtotal");

      const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
      const quantity = parseInt(quantityInput.value);
      const subtotal = price * quantity;

      subtotalCell.textContent = subtotal + " грн";
      total += subtotal;
    });

    totalDisplay.forEach(el => el.textContent = total + " грн");

    if (rows.length === 0) {
      showEmptyCart("Ваш кошик пустий");
      if (cartSummary) cartSummary.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
    }
  }

  function showEmptyCart(message) {
    cartContainer.innerHTML = `
      <div class="text-center py-5">
        <h3>${message}</h3>
        <p class="mb-4">Додайте товари, щоб продовжити покупки</p>
        <a href="Home_page.html" class="btn btn-custom">Перейти до покупок</a>
      </div>
    `;
    totalDisplay.forEach(el => el.textContent = "0 грн");
    if (cartSummary) cartSummary.style.display = 'none';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
  }
});