document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.user_id) {
    window.location.href = 'login.html';
    return;
  }

  const activeContainer = document.getElementById('activeOrders');
  const archiveContainer = document.getElementById('archivedOrders');

  let hasActive = false;
  let hasArchived = false;

  try {
    const res = await fetch(`${API_BASE}/orders/user/${user.user_id}/full`);
    const orders = await res.json();

    const uniqueOrders = [];
    const seenIds = new Set();

    orders.forEach(order => {
      if (!seenIds.has(order.order_id)) {
        seenIds.add(order.order_id);
        uniqueOrders.push(order);
      }
    });

    uniqueOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'col-md-6';

      const detailsId = `details-${order.order_id}`;
      const detailsContainer = `<div class="order-details mt-3 d-none" id="${detailsId}"></div>`;

      card.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Замовлення #${order.order_id}</h5>
            <p class="card-text">Дата: ${new Date(order.order_date).toLocaleDateString()}</p>
            <p class="card-text">Статус: ${order.status || '—'}</p>
            <p class="card-text fw-bold">Товарів: ${order.items.length}</p>
            <p class="card-text text-success fw-bold">Сума замовлення: ${order.total} грн</p>
            <button class="btn btn-outline-primary mt-2 show-details-btn" data-id="${order.order_id}">Деталі</button>
            ${detailsContainer}
          </div>
        </div>
      `;

      if (order.status === 'active') {
        activeContainer.appendChild(card);
        hasActive = true;
      } else {
        archiveContainer.appendChild(card);
        hasArchived = true;
      }
    });

    if (!hasActive) {
      document.getElementById('noActiveOrders').classList.remove('d-none');
    }
    if (!hasArchived) {
      document.getElementById('noArchivedOrders').classList.remove('d-none');
    }

    // 🔍 Обробка кнопки “Деталі”
    document.querySelectorAll(".show-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const orderId = btn.dataset.id;
        const container = document.getElementById(`details-${orderId}`);
        const order = uniqueOrders.find(o => o.order_id == orderId);

        if (!container.classList.contains("d-none")) {
          container.classList.add("d-none");
          container.innerHTML = "";
          return;
        }

        const itemsHtml = order.items.map(item => {
          const photo = item.photo?.split(',')[0]?.trim() || `img/${item.product_id}.jpg`;
          const subtotal = item.price * item.quantity;

          return `
            <div class="row align-items-center border-bottom py-2 cart-item">
              <div class="col-md-2">
                <img src="${photo}" class="img-fluid rounded" alt="${item.name}">
              </div>
              <div class="col-md-6">
                <h5>${item.name}</h5>
                <p class="mb-1">Ціна: <strong>${item.price} грн</strong></p>
                <p class="mb-1">Кількість: ${item.quantity}</p>
              </div>
              <div class="col-md-4 text-end fw-bold">${subtotal} грн</div>
            </div>
          `;
        }).join("");

        container.innerHTML = `
          ${itemsHtml}
          <div class="text-end mt-2 fw-bold">Сума: ${order.total} грн</div>
        `;
        container.classList.remove("d-none");
      });
    });

  } catch (error) {
    console.error('❌ Помилка завантаження замовлень:', error);
    activeContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити замовлення</p>';
    archiveContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити архів</p>';
  }
});