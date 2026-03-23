document.addEventListener("DOMContentLoaded", () => {
  // 🛡 Захист: лише адміністратору доступна панель
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData || userData.role !== 'admin') {
    // очищаємо будь-які залишкові дані
    localStorage.removeItem('user');
    localStorage.removeItem('adminId');
    localStorage.removeItem('isAdmin');
    window.location.href = 'login.html';
    return;
  }

  const container = document.getElementById("adminList");
  const paginationWrapper = document.createElement("div");
  paginationWrapper.className = "pagination-wrapper mt-4 d-flex justify-content-center flex-wrap";
  document.body.appendChild(paginationWrapper);

  const productNameToDelete = document.getElementById("productNameToDelete");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const addBtn = document.getElementById("add-product");

  const searchForm = document.getElementById("searchAdmin");
  const searchInput = document.getElementById("searchInput");
  const searchFeedback = document.getElementById("searchFeedback");
  const searchHints = document.getElementById("searchHints");

  let currentPage = 1;
  const limit = 9; // по 9 товарів
  let productIdToDelete = null;

  // ------------------ Завантаження товарів ------------------
  async function loadProducts(page = 1) {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const products = await res.json();

      if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = `<p class="text-center">Наразі немає товарів у наявності</p>`;
        return;
      }

      // Пагінація
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedProducts = products.slice(start, end);

      container.innerHTML = ""; // очистка перед новим рендером

      paginatedProducts.forEach(product => renderProductCard(product));

      renderPagination(products.length, page);
    } catch (err) {
      console.error("Помилка завантаження товарів:", err);
      container.innerHTML = `<p class="text-center">Помилка завантаження товарів</p>`;
    }
  }

  // ------------------ Рендер картки товару ------------------
  function renderProductCard(product) {
    const photoRaw = product.Photo ?? product.photo ?? '';
    const photoPath = photoRaw.split(",")[0].trim();
    const name = product.Name ?? product.name ?? '';
    const price = product.Price ?? product.price ?? '';

    const card = document.createElement("div");
    card.className = "col";
    card.innerHTML = `
      <div class="card h-100">
        <img src="${photoPath}" class="card-img-top" alt="${name}">
        <div class="card-body text-center">
          <h5 class="card-title">${name}</h5>
          <p class="card-price text-black fw-bold mb-1">₴ ${price}</p>
        </div>
        <div class="card-footer d-flex justify-content-around">
          <button class="btn edit-btn btn-sm" data-product-id="${product.product_id}">Змінити</button>
          <button class="btn delete-btn btn-sm" data-product-id="${product.product_id}">Видалити</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  // ------------------ Пагінація ------------------
  function renderPagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / limit);
    paginationWrapper.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-link btn ${i === currentPage ? "btn-primary" : "btn-light"} mx-1`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => {
        loadProducts(i);
      });
      paginationWrapper.appendChild(pageBtn);
    }
  }

  // ------------------ Обробники кнопок ------------------
  container.addEventListener("click", (e) => {
    if (e.target.classList.contains("edit-btn")) {
      const id = e.target.dataset.productId;
      window.location.href = `admin-form.html?id=${id}`;
    }

    if (e.target.classList.contains("delete-btn")) {
      productIdToDelete = e.target.dataset.productId;
      const productCard = e.target.closest(".card");
      const productName = productCard.querySelector(".card-title").textContent;

      productNameToDelete.textContent = productName;

      const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));
      deleteModal.show();
    }
  });

  // utility to show temporary flash message (used for deletion success)
  function showFlashMessage(msg, duration = 1600) {
    const popup = document.getElementById('popup-message');
    if (!popup) return; // element may not exist
    popup.textContent = msg;
    popup.style.display = 'block';
    popup.offsetWidth; // force reflow
    popup.style.opacity = '1';
    setTimeout(() => {
      popup.style.opacity = '0';
      popup.addEventListener('transitionend', function handler() {
        popup.style.display = 'none';
        popup.removeEventListener('transitionend', handler);
      });
    }, duration);
  }

  confirmDeleteBtn.addEventListener("click", async () => {
    if (productIdToDelete) {
      try {
        await fetch(`${API_BASE}/products/${productIdToDelete}`, { method: "DELETE" });
        showFlashMessage("Товар видалено!");
        // закриваємо модал після успіху
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById("deleteModal"));
        if (modalInstance) modalInstance.hide();
        loadProducts(currentPage); // оновлюємо список
      } catch (err) {
        console.error("Помилка видалення товару:", err);
        alert("Не вдалося видалити товар");
      }
    }
  });

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.location.href = "admin-form.html"; // без id → режим додавання
    });
  }

  // ------------------ Пошук ------------------
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();

    try {
      let products = [];

      if (query && /^\d+$/.test(query)) {
        // якщо в полі чисто цифри – пробуємо знайти по ID
        const res = await fetch(`${API_BASE}/products/${query}`);
        if (res.ok) {
          const prod = await res.json();
          products = [prod];
        } else if (res.status === 404) {
          products = [];
        } else {
          throw new Error(`Сервер повернув статус ${res.status}`);
        }
      } else {
        // звичайний текстовий запит
        const res = await fetch(`${API_BASE}/products?search=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error(`Сервер повернув статус ${res.status}`);
        }
        products = await res.json();
      }

      container.innerHTML = "";
      if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = `<p class="text-center">Товар не знайдено</p>`;
        searchFeedback.textContent = `За запитом "${query}" нічого не знайдено`;
        return;
      }

      products.forEach(product => renderProductCard(product));
      searchFeedback.textContent = `Знайдено ${products.length} товар(ів) за запитом "${query}"`;

      // якщо шукали по ID і результат один — швидко переходимо до сторінки редагування
      if (products.length === 1 && /^\d+$/.test(query)) {
        const id = products[0].product_id || products[0].id;
        if (id) {
          window.location.href = `admin-form.html?id=${id}`;
        }
      }
    } catch (err) {
      console.error("Помилка пошуку:", err);
      container.innerHTML = `<p class="text-center">Помилка пошуку товарів</p>`;
    }
  });

  // ------------------ Автопідказки ------------------
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim();
    if (query.length < 1) {
      searchHints.innerHTML = "";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/products/hints?hint=${encodeURIComponent(query)}`);
      const hints = await res.json();

      searchHints.innerHTML = "";
      if (Array.isArray(hints) && hints.length > 0) {
        hints.forEach(product => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "list-group-item list-group-item-action";
          item.textContent = `${product.Name} (ID: ${product.product_id})`;

          // при кліку підставляємо ID у поле пошуку
          item.addEventListener("click", () => {
            searchInput.value = product.product_id;
            searchHints.innerHTML = "";
          });

          searchHints.appendChild(item);
        });
      }
    } catch (err) {
      console.error("Помилка отримання підказок:", err);
    }
  });

  // ------------------ Початкове завантаження ------------------
  loadProducts(currentPage);

  // ------------------ Вихід ------------------
  const logoutBtn = document.getElementById("admin-auth-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // видаляємо все, що могли залишити після входу
      localStorage.removeItem('user');
      localStorage.removeItem('adminId');
      localStorage.removeItem('isAdmin');
      window.location.href = "login.html"; // переадресація на сторінку входу
    });
  }

  async function loadAdminName() {
    try {
      // тут можна брати id адміна з sessionStorage або localStorage після логіну
      const adminId = localStorage.getItem("adminId");
      if (!adminId) return;

      const res = await fetch(`${API_BASE}/users/admin/${adminId}`);
      const admin = await res.json();

      document.getElementById("admin-name").textContent = admin.Name;
    } catch (err) {
      console.error("Помилка отримання імені адміна:", err);
    }
  }

  loadAdminName();
});