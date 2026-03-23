const DELIVERY_STEPS = [
  { key: 'Очікування', icon: '⏳', label: 'Очікування' },
  { key: 'Ваше замовлення чекає перевізника', icon: '👷', label: 'Ваше замовлення чекає перевізника' },
  { key: 'Замовлення прямує до вас', icon: '🚚', label: 'Замовлення прямує до вас' },
  { key: 'Замовлення очікує вас', icon: '📦', label: 'Замовлення очікує вас' },
  { key: 'Доставлено', icon: '✅', label: 'Доставлено' }
];

const STEP_MINUTES = 4; // 5 статусів * 4 хв = ~20 хв

function statusToIndex(status) {
  const normalized = String(status || '').toLowerCase().trim();

  if (normalized === 'доставлено') return 4;
  if (normalized.includes('очікує вас')) return 3;
  if (normalized.includes('прямує')) return 2;
  if (normalized.includes('перевізника')) return 1;
  if (normalized.includes('очікування') || normalized === 'оплачено' || normalized === 'pending') return 0;

  return 0;
}

function getTimeBasedIndex(orderDate) {
  const start = new Date(orderDate).getTime();
  if (!Number.isFinite(start)) return 0;

  const elapsedMs = Date.now() - start;
  const step = Math.floor(elapsedMs / (STEP_MINUTES * 60 * 1000));
  return Math.max(0, Math.min(4, step));
}

function renderTimeline(currentIndex) {
  return `
    <div class="delivery-timeline">
      ${DELIVERY_STEPS.map((step, idx) => {
        const state = idx < currentIndex ? 'done' : idx === currentIndex ? 'active' : 'pending';
        return `
          <div class="timeline-step ${state}">
            <div class="step-icon">${step.icon}</div>
            <div class="step-text">${step.label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function showPaymentBanner() {
  const banner = document.getElementById('paymentResultBanner');
  if (!banner) return;

  const raw = sessionStorage.getItem('lastPaymentResult');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (!data || !data.message) return;

    const ok = data.payment_status === 'успішна';
    banner.textContent = data.message;
    banner.classList.remove('d-none', 'alert-success', 'alert-danger');
    banner.classList.add(ok ? 'alert-success' : 'alert-danger');

    sessionStorage.removeItem('lastPaymentResult');
  } catch (err) {
    console.warn('Некоректний lastPaymentResult у sessionStorage');
  }
}

function renderItems(items, { showUnitPrice = false } = {}) {
  return (items || []).map((item) => {
    const photo = String(item.Photo || '').split(',')[0]?.trim() || `img/${item.product_id}.jpg`;
    const price = Number(item.price_at_order || 0);
    const quantity = Number(item.quantity || 0);
    const subtotal = price * quantity;
    const unitText = showUnitPrice ? ` × ${price} грн` : '';

    return `
      <div class="order-item-row">
        <img src="${photo}" class="order-item-photo" alt="${item.Name || 'Товар'}">
        <div class="order-item-meta">
          <div class="order-item-name">${item.Name || 'Товар'}</div>
          <div class="order-item-sub">${quantity}${unitText}</div>
        </div>
        <div class="order-item-total">${subtotal} грн</div>
      </div>
    `;
  }).join('');
}

function buildOrderCard(order, { isArchive = false } = {}) {
  const paymentStatus = String(order.payment_status || '').toLowerCase();
  const paymentOk = paymentStatus === 'успішна';

  const dateText = order.order_date
    ? new Date(order.order_date).toLocaleString('uk-UA')
    : '—';

  const indexByStatus = statusToIndex(order.status);
  const indexByTime = getTimeBasedIndex(order.order_date);
  const currentIndex = paymentOk ? Math.max(indexByStatus, indexByTime) : 0;

  const paymentBadge = isArchive
    ? `<span class="order-status-archive">Доставлено</span>`
    : paymentOk
      ? `<span class="badge text-bg-success">Оплата успішна</span>`
      : `<span class="badge text-bg-danger">Оплата не успішна</span>`;

  const timelineHtml = isArchive
    ? ''
    : paymentOk
      ? renderTimeline(currentIndex)
      : `<div class="payment-failed-note">Замовлення збережено як не оплачене. Спробуйте оплатити повторно.</div>`;

  const paymentMethodBadge = isArchive
    ? ''
    : `<span class="badge text-bg-secondary">${order.payment_method || 'card'}</span>`;

  const itemsHtml = renderItems(order.items, { showUnitPrice: isArchive });
  const totalHtml = `Сума: ${Number(order.total || order.amount || 0)} грн`;

  const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

  const orderDetailsHtml = isArchive
    ? itemsCount <= 1
      ? `
          <div class="order-items-list mt-3">${itemsHtml}</div>
          <div class="order-total">${totalHtml}</div>
        `
      : `
          <button class="btn btn-custom order-details-toggle" type="button" aria-expanded="false">Деталі</button>
          <div class="order-archive-details d-none">
            <div class="order-items-list mt-3">${itemsHtml}</div>
            <div class="order-total">${totalHtml}</div>
          </div>
        `
    : `
          <div class="order-items-list mt-3">${itemsHtml}</div>
          <div class="order-total">${totalHtml}</div>
      `;

  return `
    <div class="col-12">
      <div class="card order-card shadow-sm${isArchive ? ' order-card-archive' : ''}">
        <div class="card-body">
          <div class="order-header-row">
            <div>
              <h5 class="mb-1">Замовлення #${order.order_id}</h5>
              <div class="text-muted">${dateText}</div>
            </div>
            <div class="d-flex gap-2 align-items-center">
              ${paymentBadge}
              ${paymentMethodBadge}
            </div>
          </div>

          ${orderDetailsHtml}

          <div class="mt-3">
            ${timelineHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadOrders() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.user_id) {
    window.location.href = 'login.html';
    return;
  }

  const activeContainer = document.getElementById('activeOrders');
  const archiveContainer = document.getElementById('archivedOrders');
  const noActive = document.getElementById('noActiveOrders');
  const noArchive = document.getElementById('noArchivedOrders');

  if (!activeContainer || !archiveContainer) return;

  try {
    const apiRoot = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000';
    const res = await fetch(`${apiRoot}/orders/user/${user.user_id}/full?t=${Date.now()}`);
    const orders = await res.json();

    activeContainer.innerHTML = '';
    archiveContainer.innerHTML = '';

    if (!Array.isArray(orders) || orders.length === 0) {
      if (noActive) noActive.classList.remove('d-none');
      if (noArchive) noArchive.classList.remove('d-none');
      return;
    }

    let hasActive = false;
    let hasArchive = false;

    orders.forEach((order) => {
      const paymentStatus = String(order.payment_status || '').toLowerCase();
      const paymentOk = paymentStatus === 'успішна';
      const currentIndex = paymentOk
        ? Math.max(statusToIndex(order.status), getTimeBasedIndex(order.order_date))
        : 0;

      const isArchive = !paymentOk || currentIndex >= 4;
      const target = isArchive ? archiveContainer : activeContainer;

      target.insertAdjacentHTML('beforeend', buildOrderCard(order, { isArchive }));

      if (isArchive) hasArchive = true;
      else hasActive = true;
    });

    if (noActive) noActive.classList.toggle('d-none', hasActive);
    if (noArchive) noArchive.classList.toggle('d-none', hasArchive);
  } catch (error) {
    console.error('Помилка завантаження замовлень:', error);
    activeContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити замовлення</p>';
    archiveContainer.innerHTML = '<p class="text-danger text-center">Не вдалося завантажити архів</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showPaymentBanner();
  await loadOrders();

  // Підтягування статусів і перерендер раз на хвилину
  setInterval(loadOrders, 60 * 1000);
});

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.order-details-toggle');
  if (!toggle) return;

  const card = toggle.closest('.order-card');
  const details = card?.querySelector('.order-archive-details');
  if (!details) return;

  const shouldOpen = details.classList.contains('d-none');
  details.classList.toggle('d-none', !shouldOpen);
  toggle.setAttribute('aria-expanded', String(shouldOpen));
  toggle.textContent = shouldOpen ? 'Сховати' : 'Деталі';
});
