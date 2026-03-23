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
  const paymentModalEl = document.getElementById("paymentModal");
  const paymentForm = document.getElementById("paymentForm");

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
  const collectOrderItems = () => {
    const orderItems = [];

    document.querySelectorAll(".cart-item").forEach(row => {
      const productId = row.querySelector(".remove-btn").dataset.id;
      const quantity = parseInt(row.querySelector(".item-qty").value);
      orderItems.push({ product_id: productId, quantity });
    });

    return orderItems;
  };

  // Імітація оплати через модальне вікно
  checkoutBtn.addEventListener("click", () => {
    const orderItems = collectOrderItems();
    if (orderItems.length === 0) {
      alert("Кошик порожній");
      return;
    }

    if (!paymentModalEl || typeof bootstrap === "undefined") {
      alert("Модальне вікно оплати недоступне");
      return;
    }

    const modal = new bootstrap.Modal(paymentModalEl);
    modal.show();
  });

  paymentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const orderItems = collectOrderItems();
    if (orderItems.length === 0) {
      alert("Кошик порожній");
      return;
    }

    const cardNumber = document.getElementById("cardNumber")?.value.trim() || "";
    const expiryDate = document.getElementById("expiryDate")?.value.trim() || "";
    const cvv = document.getElementById("cvv")?.value.trim() || "";
    const method = document.getElementById("method")?.value || "card";

    if (method === "card" && (cardNumber.replace(/\s/g, "").length < 16 || expiryDate.length < 4 || cvv.length < 3)) {
      alert("Некоректні дані картки");
      return;
    }

    const submitBtn = paymentForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    checkoutBtn.disabled = true;

    try {
      const res = await fetch("http://localhost:5000/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          items: orderItems,
          payment_method: method,
          card_number: cardNumber,
          expiry_date: expiryDate,
          cvv
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        data = { error: "Сервер повернув некоректну відповідь" };
      }

      if (res.ok || res.status === 402) {
        const modal = bootstrap.Modal.getInstance(paymentModalEl);
        if (modal) modal.hide();

        const paymentStatus = data.payment_status || (res.ok ? "успішна" : "невдала");
        const paymentOk = paymentStatus === "успішна";

        if (paymentOk) {
          cartContainer.innerHTML = "";
          totalDisplay.forEach(el => el.textContent = "0 грн");
        }

        const paymentMessage = paymentOk
          ? `Оплата успішна (${method})! Замовлення оформлено.`
          : `Оплата не успішна (${method}). Спробуйте ще раз.`;

        sessionStorage.setItem("lastPaymentResult", JSON.stringify({
          order_id: data.order_id,
          payment_status: paymentStatus,
          payment_method: method,
          message: paymentMessage,
          created_at: new Date().toISOString()
        }));

        showPopup(paymentMessage);
        setTimeout(() => {
          window.location.href = "my_order.html";
        }, 2000);
      } else {
        alert("Помилка: " + data.error);
        checkoutBtn.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        const modal = new bootstrap.Modal(paymentModalEl);
        modal.show();
      }
    } catch (error) {
      console.error("❌ Помилка оформлення:", error);
      alert("Не вдалося оформити замовлення");
      checkoutBtn.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
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

document.addEventListener("DOMContentLoaded", () => {
  const avatarLink = document.getElementById("avatarLink");
  const ribbon = document.getElementById("userNameRibbon");

  if (!avatarLink || !ribbon) return;

  avatarLink.addEventListener("click", (e) => {
    e.preventDefault();

    const rawUser = localStorage.getItem("user");
    let user = null;

    try {
      user = JSON.parse(rawUser);
    } catch (err) {
      console.warn("⚠️ Некоректний user у localStorage");
    }

    if (user && typeof user.user_id === "number") {
      if (user.role === 'admin') {
        window.location.href = "admin.html";
      } else {
        window.location.href = "account.html";
      }
    } else {
      // Якщо користувач не в системі — направляємо на сторінку реєстрації
      window.location.href = "register.html";
    }
  });

  const rawUser = localStorage.getItem("user");
  let user = null;

  try {
    user = JSON.parse(rawUser);
  } catch (err) {
    console.warn("⚠️ Некоректний user у localStorage");
  }

  if (user && user.name) {
    ribbon.textContent = `Привіт, ${user.name}!`;
  } else {
    ribbon.style.display = "none";
  }

  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

function showPopup(message, duration = 2000) {
  const popup = document.getElementById('popup-message');
  popup.textContent = message;
  popup.style.display = 'block';
  popup.style.opacity = '1';

  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => {
      popup.style.display = 'none';
    }, 300);
  }, duration);
}
