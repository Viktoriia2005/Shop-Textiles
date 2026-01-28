document.addEventListener("DOMContentLoaded", async () => {
  // helper to render 5 stars with half-star support
  const renderStars = (rating) => {
    const r = parseFloat(String(rating).replace(',', '.')) || 0;
    const max = 5;
    let out = '';
    for (let i = 1; i <= max; i++) {
      if (r >= i) {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
      } else if (r >= i - 0.5) {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="halfGradH${i}" x1="0" x2="1"><stop offset="50%" stop-color="#FFC107"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z" fill="url(#halfGradH${i})" stroke="#FFC107"/></svg>`;
      } else {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
      }
    }
    return out;
  };
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
            <div class="mb-2 d-flex align-items-center justify-content-center gap-2">
              <div class="rating-stars">${renderStars(product.Rating)}</div>
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
    const btn = e.target;
    if (btn.disabled) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || !user.user_id) {
      window.location.href = "login.html";
      return;
    }

    const productId = btn.dataset.id;

    try {
      btn.disabled = true;
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
        showPopup("Товар додано до кошика!");
        setTimeout(() => { btn.disabled = false; }, 500);
      } else {
        showPopup("Помилка: " + data.error);
        btn.disabled = false;
      }
    } catch (error) {
      console.error("❌ Помилка додавання:", error);
      showPopup("Не вдалося додати товар");
      btn.disabled = false;
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