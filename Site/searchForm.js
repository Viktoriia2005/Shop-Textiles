// 🔗 База API: підхоплюємо з `config.js`, якщо доступно
const PRODUCTS_BASE = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000') + '/products';

// 🔧 DOM-елементи (захищені — якщо на сторінці немає пошуку, скрипт тихо не робить нічого)
const searchInput = document.getElementById("searchInput");
const hintsBox = document.getElementById("searchHints");
const feedback = document.getElementById("searchFeedback");
// Results can live under different IDs depending on page; fall back to common containers
const results = document.getElementById("searchResults") || document.getElementById("veilList") || document.getElementById("product-list") || document.getElementById("productList") || document.getElementById("product-list-container");

if (!searchInput || !feedback || !results) {
  // Нічого не робимо якщо базові елементи відсутні на сторінці
  // Це запобігає помилкам на сторінках, де пошук не потрібен
  console.warn('searchForm.js: пошукові елементи не знайдені на сторінці — пропускаємо ініціалізацію');
} else {

  // 🔎 Автопідказки
  searchInput.addEventListener("input", async function () {
    const hint = searchInput.value.trim().toLowerCase();

    if (hint.length < 1) {
      if (hintsBox) hintsBox.innerHTML = "";
      // Якщо користувач очистив поле пошуку — приберемо результати і повідомлення
      if (results) results.innerHTML = "";
      if (feedback) feedback.innerHTML = "";
      return;
    }

    try {
      const res = await fetch(`${PRODUCTS_BASE}/hints?hint=${encodeURIComponent(hint)}`);
      if (!res.ok) throw new Error(`Сервер повернув статус: ${res.status}`);

      const hints = await res.json();

      if (!Array.isArray(hints) || hints.length === 0) {
        if (hintsBox) hintsBox.innerHTML = "";
        return;
      }

      if (hintsBox) hintsBox.innerHTML = "";

      hints.forEach(item => {
        const option = document.createElement("button");
        option.className = "list-group-item list-group-item-action";
        option.textContent = item.Name || item.name || '';
        option.addEventListener("click", () => {
          searchInput.value = item.Name || item.name || '';
          if (hintsBox) hintsBox.innerHTML = "";
          const form = document.getElementById("searchForm");
          if (form) form.dispatchEvent(new Event("submit"));
        });
        if (hintsBox) hintsBox.appendChild(option);
      });
    } catch (error) {
      console.error("❌ Помилка підказок:", error);
      if (hintsBox) hintsBox.innerHTML = "";
    }
  });

  // У деяких браузерах натискання хрестика у полі type=search викликає подію 'search'
  searchInput.addEventListener('search', function () {
    const q = searchInput.value.trim();
    if (!q) {
      if (results) results.innerHTML = '';
      if (feedback) feedback.innerHTML = '';
      if (hintsBox) hintsBox.innerHTML = '';
    }
  });
}

// 🔍 Основний пошук
const form = document.getElementById("searchForm");
if (form && searchInput && feedback && results) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const query = searchInput.value.trim();
    if (hintsBox) hintsBox.innerHTML = "";
    results.innerHTML = "";

    if (!query) {
      feedback.innerHTML = `<p class="text-danger">Введіть запит для пошуку</p>`;
      return;
    }

    feedback.innerHTML = `<p class="text-muted">Шукаємо: <strong>${query}</strong>…</p>`;

    try {
      const res = await fetch(`${PRODUCTS_BASE}?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Сервер повернув статус: ${res.status}`);

      const products = await res.json();

      if (!Array.isArray(products) || products.length === 0) {
        feedback.innerHTML = `<p class="text-warning">Нічого не знайдено за запитом: <strong>${query}</strong></p>`;
        return;
      }

      // Фільтруємо за наявністю: багато API повертає різні імена полів для запасу
      const isAvailable = (p) => {
        if (!p) return false;
        const candidates = [
          p.stock, p.Stock, p.quantity, p.Quantity, p.qty, p.Qty,
          p.in_stock, p.inStock, p.available, p.Available, p.is_available, p.isAvailable,
          p.count, p.Count
        ];
        for (const c of candidates) {
          if (c === undefined || c === null) continue;
          if (typeof c === 'boolean') return c === true;
          if (typeof c === 'number') return c > 0;
          if (typeof c === 'string') {
            const n = parseInt(c.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(n)) return n > 0;
            const lc = c.toLowerCase();
            if (lc === 'true' || lc === 'yes' || lc === 'available' || lc === 'in stock') return true;
            if (lc === 'false' || lc === 'no' || lc === 'out' || lc === 'out of stock' || lc === 'unavailable') return false;
          }
        }
        // Якщо нічого не виявлено — вважатимемо, що товар доступний (щоб не випадково ховати всё)
        return true;
      };

      // Відфільтрований список
      const visible = products.filter(p => isAvailable(p));
      if (visible.length === 0) {
        feedback.innerHTML = `<p class="text-warning">За запитом <strong>${query}</strong> товари є, але наразі всі відсутні в наявності</p>`;
        return;
      }

      feedback.innerHTML = `<p style="color: #834906">Знайдено: ${visible.length} товарів (в наявності)</p>`;

      // small helper to render stars with half support
      const renderStars = (rating) => {
        const r = parseFloat(String(rating).replace(',', '.')) || 0;
        const max = 5;
        let out = '';
        for (let i = 1; i <= max; i++) {
          if (r >= i) {
            out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
          } else if (r >= i - 0.5) {
            out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="halfGradS${i}" x1="0" x2="1"><stop offset="50%" stop-color="#FFC107"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z" fill="url(#halfGradS${i})" stroke="#FFC107"/></svg>`;
          } else {
            out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
          }
        }
        return out;
      };

      visible.forEach(product => {
        const photoRaw = product.Photo || product.photo || '';
        const photoPath = (typeof photoRaw === 'string' ? photoRaw.split(/[,;]+/)[0].trim() : '') || 'img/default.jpg';
        const name = product.Name || product.name || 'Товар';
        const price = product.Price || product.price || '—';

        const card = document.createElement("div");
        card.className = "col-md-4";
        // додаємо кнопку "Купити" у картку результату
        const productId = product.product_id || product.id || product.ProductId || product.productId;
        card.innerHTML = `
            <div class="card h-100">
              <a href="#">
                <img src="${photoPath}" class="card-img-top" alt="${name}">
              </a>
              <div class="card-body text-center d-flex flex-column justify-content-between">
                <div>
                  <h5 class="card-title">${name}</h5>
                  <p class="card-price text-black fw-bold mb-1">₴ ${price}</p>
                  <div class="mb-2 d-flex align-items-center justify-content-center gap-2">
                    <div class="rating-stars">${renderStars(product.Rating || product.rating)}</div>
                    <small class="text-muted">(${product.Rating || product.rating || ''})</small>
                  </div>
                </div>
                <button class="btn btn-custom buy-btn mt-2" data-id="${productId}">Купити</button>
              </div>
            </div>
          `;

        if (results) results.appendChild(card);

        // Кнопка "Купити" — робить quick-add до кошика, як на головній
        const buyBtn = card.querySelector('.buy-btn');
        if (buyBtn) {
          buyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (buyBtn.disabled) return;

            const rawUser = localStorage.getItem('user');
            let user = null;
            try { user = JSON.parse(rawUser); } catch (err) { /* ignore */ }
            if (!user || !user.user_id) {
              window.location.href = 'login.html';
              return;
            }

            const apiRoot = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000');
            try {
              buyBtn.disabled = true;
              const resAdd = await fetch(`${apiRoot}/cart/quick-add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.user_id, product_id: Number(buyBtn.dataset.id) })
              });
              const data = await resAdd.json();
              if (resAdd.ok) {
                alert('Товар додано до кошика!');
              } else {
                alert('Помилка: ' + (data.error || 'Не вдалося додати товар'));
              }
            } catch (err) {
              console.error('❌ Помилка додавання в кошик:', err);
              alert('Не вдалося додати товар');
            } finally {
              buyBtn.disabled = false;
            }
          });
        }
      });
    } catch (error) {
      console.error("❌ Помилка пошуку:", error);
      feedback.innerHTML = `<p class="text-danger">Сталася помилка при пошуку</p>`;
    }
  });
}