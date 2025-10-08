document.addEventListener("DOMContentLoaded", async () => {
  const productList = document.getElementById("product-list");

  try {
    const res = await fetch(`${API_BASE}/products`);
    const products = await res.json();

    const featuredIds = [2, 5, 7, 10, 12, 16, 20, 24];
    const featuredProducts = products.filter(product =>
      featuredIds.includes(product.product_id)
    );

    productList.innerHTML = "";

    featuredProducts.forEach(product => {
      let photoPath = 'img/default.jpg';

      if (typeof product.Photo === 'string' && product.Photo.length > 0) {
        photoPath = product.Photo.split(',')[0].trim();
      }

      const card = document.createElement("div");
      card.className = "col";
      card.innerHTML = `
        <div class="card h-100 shadow-sm d-flex flex-column justify-content-between">
          <img src="${photoPath}" class="card-img-top" alt="${product.Name}">
          <div class="card-body text-center">
            <h5 class="card-title">${product.Name}</h5>
            <p class="card-price text-black fw-bold mb-1">₴ ${product.Price}</p>
            <div class="mb-2">
              <span class="text-warning">&#9733;&#9733;&#9733;&#9733;${product.Rating >= 4.5 ? '&#189;' : '&#9734;'}</span>
              <small class="text-muted">(${product.Rating})</small>
            </div>
          </div>
          <button class="btn btn-custom btn-sm buy-btn mx-3 mb-3" data-id="${product.product_id}">
            Купити
          </button>
        </div>
      `;
      productList.appendChild(card);
    });

  } catch (error) {
    console.error("❌ Помилка завантаження товарів:", error);
    productList.innerHTML = "<p>Не вдалося завантажити товари</p>";
  }
});

document.addEventListener("click", async function (e) {
  if (e.target.classList.contains("buy-btn")) {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || !user.user_id) {
      window.location.href = "login.html";
      return;
    }

    const productId = e.target.dataset.id;

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
        alert("Товар додано до кошика!");
      } else {
        alert("Помилка: " + data.error);
      }
    } catch (error) {
      console.error("❌ Помилка додавання:", error);
      alert("Не вдалося додати товар");
    }
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
      window.location.href = "account.html";
    } else {
      window.location.href = "login.html";
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
});