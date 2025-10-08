// 🔗 Локальний шлях тільки для товарів
const PRODUCTS_BASE = "http://localhost:5000/products";

// 🔧 DOM-елементи
const searchInput = document.getElementById("searchInput");
const hintsBox = document.getElementById("searchHints");
const feedback = document.getElementById("searchFeedback");
const results = document.getElementById("searchResults");

// 🔎 Автопідказки
searchInput.addEventListener("input", async function () {
  const hint = searchInput.value.trim().toLowerCase();

  if (hint.length < 1) {
    hintsBox.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`${PRODUCTS_BASE}/hints?hint=${encodeURIComponent(hint)}`);
    if (!res.ok) throw new Error(`Сервер повернув статус: ${res.status}`);

    const hints = await res.json();

    if (!Array.isArray(hints) || hints.length === 0) {
      hintsBox.innerHTML = "";
      return;
    }

    hintsBox.innerHTML = "";

    hints.forEach(item => {
      const option = document.createElement("button");
      option.className = "list-group-item list-group-item-action";
      option.textContent = item.Name;
      option.addEventListener("click", () => {
        searchInput.value = item.Name;
        hintsBox.innerHTML = "";
        document.getElementById("searchForm").dispatchEvent(new Event("submit"));
      });
      hintsBox.appendChild(option);
    });
  } catch (error) {
    console.error("❌ Помилка підказок:", error);
    hintsBox.innerHTML = "";
  }
});

// 🔍 Основний пошук
document.getElementById("searchForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const query = searchInput.value.trim().toLowerCase();
  hintsBox.innerHTML = "";
  results.innerHTML = "";

  if (!query) {
    feedback.innerHTML = `<p class="text-danger">Введіть запит для пошуку</p>`;
    return;
  }

  feedback.innerHTML = `<p class="text-muted">Шукаємо: <strong>${query}</strong>…</p>`;

  try {
    const res = await fetch(`${PRODUCTS_BASE}/?search=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Сервер повернув статус: ${res.status}`);

    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      feedback.innerHTML = `<p class="text-warning">Нічого не знайдено за запитом: <strong>${query}</strong></p>`;
      return;
    }

    feedback.innerHTML = `<p class="text-success">Знайдено: ${products.length} товарів</p>`;

    products.forEach(product => {
      const photoPath = product.Photo.split(";")[0].trim();

      const card = document.createElement("div");
      card.className = "col-md-4";
      card.innerHTML = `
        <div class="card h-100">
          <a href="#">
            <img src="${photoPath}" class="card-img-top" alt="${product.Name}">
          </a>
          <div class="card-body text-center">
            <h5 class="card-title">${product.Name}</h5>
            <p class="card-price text-black fw-bold mb-1">₴ ${product.Price}</p>
            <div class="mb-2">
              <span class="text-warning">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
              <small class="text-muted">(${product.Rating})</small>
            </div>
          </div>
        </div>
      `;
      results.appendChild(card);
    });
  } catch (error) {
    console.error("❌ Помилка пошуку:", error);
    feedback.innerHTML = `<p class="text-danger">Сталася помилка при пошуку</p>`;
  }
});