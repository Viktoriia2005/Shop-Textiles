document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("tableList");

  try {
    const res = await fetch("http://localhost:5000/products/tag/скатертина");
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `<p class="text-center">Наразі немає скатертин у наявності</p>`;
      return;
    }

    products.forEach(product => {
      const photoPath = product.Photo.split(",")[0].trim();

      const card = document.createElement("div");
      card.className = "col";
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
          <button class="btn btn-custom btn-sm buy-btn" data-product-id="${product.product_id}">
            Купити
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    // 🔐 Кнопка “Купити”
    document.querySelectorAll(".buy-btn").forEach(button => {
      button.addEventListener("click", async () => {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || !user.user_id) {
          window.location.href = "login.html";
          return;
        }

        const productId = button.getAttribute("data-product-id");

        try {
          const res = await fetch("http://localhost:5000/cart/quick-add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.user_id,
              product_id: Number(productId)
            })
          });

          const data = await res.json();
          if (res.ok) {
            alert(data.message || "Товар додано до кошика!");
          } else {
            alert("Помилка: " + data.error);
          }
        } catch (error) {
          console.error("❌ Помилка додавання:", error);
          alert("Не вдалося додати товар");
        }
      });
    });

  } catch (error) {
    console.error("❌ Помилка завантаження скатертин:", error);
    container.innerHTML = `<p class="text-center text-danger">Не вдалося завантажити товари</p>`;
  }
});