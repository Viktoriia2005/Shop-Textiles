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

    // Хелпер для пошуку першого доступного поля у кількох варіантах
    const getFirst = (obj, keys) => {
      if (!obj) return undefined;
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return undefined;
    };

    // Хелпер для рендерингу рядків товарів у замовленні
    const renderItemsHtml = (order) => {
      return order.items.map(item => {
        const photoRaw = getFirst(item, ['photo', 'Photo']) || getFirst(item.product, ['photo', 'Photo']) || '';
        const photo = (typeof photoRaw === 'string' && photoRaw.length) ? photoRaw.split(',')[0].trim() : `img/${getFirst(item, ['product_id', 'productId', 'id']) || 'default'}.jpg`;

        const name = getFirst(item, ['name', 'Name', 'product_name', 'ProductName']) || getFirst(item.product, ['Name', 'name']) || 'Товар';

        const priceRaw = getFirst(item, ['price', 'Price', 'unit_price', 'UnitPrice']) || getFirst(item.product, ['Price', 'price']);
        const price = Number(priceRaw) || 0;

        const quantity = Number(getFirst(item, ['quantity', 'qty', 'Qty'])) || 1;
        const subtotal = price * quantity;

        return `
          <div class="row align-items-center border-bottom py-2 cart-item">
            <div class="col-md-2">
              <img src="${photo}" class="img-fluid rounded" alt="${name}">
            </div>
            <div class="col-md-6">
              <h5>${name}</h5>
              <p class="mb-1">Ціна: <strong>${price} грн</strong></p>
              <p class="mb-1">Кількість: ${quantity}</p>
            </div>
            <div class="col-md-4 text-end fw-bold">${subtotal} грн</div>
          </div>
        `;
      }).join('');
    };

    // Рендеримо кожне замовлення окремо.
    uniqueOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'col-md-6';

      const itemsHtml = renderItemsHtml(order);
      const computedTotal = order.total || order.items.reduce((s, it) => {
        const pr = Number(getFirst(it, ['price', 'Price', 'unit_price'])) || Number(getFirst(it.product, ['Price'])) || 0;
        const q = Number(getFirst(it, ['quantity', 'qty'])) || 1;
        return s + pr * q;
      }, 0);

      // Якщо в замовленні лише один товар (навіть якщо кількість >1) — показуємо повні деталі одразу
      if (order.items.length === 1) {
        card.innerHTML = `
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Замовлення #${order.order_id}</h5>
              <p class="card-text">Дата: ${new Date(order.order_date).toLocaleDateString()}</p>
              <p class="card-text">Статус: ${order.status || '—'}</p>
              <p class="card-text fw-bold">Товарів: ${order.items.length}</p>
              <p class="card-text fw-bold">Сума замовлення: ${computedTotal} грн</p>
              <div class="order-details mt-3">${itemsHtml}</div>
            </div>
          </div>
        `;
      } else {
        // Багато товарів у замовленні — компактний вигляд з кнопкою "Деталі"
        const detailsId = `details-${order.order_id}`;
        card.innerHTML = `
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Замовлення #${order.order_id}</h5>
              <p class="card-text">Дата: ${new Date(order.order_date).toLocaleDateString()}</p>
              <p class="card-text">Статус: ${order.status || '—'}</p>
              <p class="card-text fw-bold">Товарів: ${order.items.length}</p>
              <p class="card-text fw-bold">Сума замовлення: ${computedTotal} грн</p>
              <button class="btn btn-custom mt-2 show-details-btn" data-id="${order.order_id}">Деталі</button>
              <div class="order-details mt-3 d-none" id="${detailsId}">${itemsHtml}<div class="text-end mt-2 fw-bold">Сума: ${computedTotal} грн</div></div>
            </div>
          </div>
        `;

        // Додаємо обробник тільки для цієї кнопки — він показує/ховає контейнер з деталями для цього card
        const btn = card.querySelector('.show-details-btn');
        const detailsEl = card.querySelector(`#${detailsId}`);
        if (btn && detailsEl) {
          btn.addEventListener('click', () => detailsEl.classList.toggle('d-none'));
        }
      }

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



  } catch (error) {
    console.error('❌ Помилка завантаження замовлень:', error);
    activeContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити замовлення</p>';
    archiveContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити архів</p>';
  }
});