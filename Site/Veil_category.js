document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("veilList");

  try {
    const res = await fetch("http://localhost:5000/products/tag/Покривало");
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `<p class="text-center">Наразі немає покривал у наявності</p>`;
      return;
    }

    // helper: render up to 5 stars, support half stars
    const renderStars = (rating) => {
      const r = parseFloat(String(rating).replace(',', '.')) || 0;
      const max = 5;
      let out = '';
      for (let i = 1; i <= max; i++) {
        if (r >= i) {
          // full star
          out += `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
        } else if (r >= i - 0.5) {
          // half star: render left half filled using linearGradient
          out += `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="halfGrad${i}" x1="0" x2="1"><stop offset="50%" stop-color="#FFC107"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z" fill="url(#halfGrad${i})" stroke="#FFC107"/></svg>`;
        } else {
          // empty star
          out += `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
        }
      }
      return out;
    };

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
            <div class="mb-2 d-flex align-items-center justify-content-center gap-2">
              <div class="rating-stars">${renderStars(product.Rating)}</div>
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

    // 🔐 Кнопка “Купити” — додаємо захист від подвійних запитів
    document.querySelectorAll(".buy-btn").forEach(button => {
      button.addEventListener("click", async () => {
        const btn = button;
        if (btn.disabled) return;

        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || !user.user_id) {
          window.location.href = "login.html";
          return;
        }

        const productId = button.getAttribute("data-product-id");

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
            showPopup(data.message || "Товар додано до кошика!");
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
      });
    });

  } catch (error) {
    console.error("❌ Помилка завантаження покривал:", error);
    container.innerHTML = `<p class="text-center text-danger">Не вдалося завантажити товари</p>`;
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