document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("tableList");
  const sortAscBtn = document.getElementById("sortAsc");
  const sortDescBtn = document.getElementById("sortDesc");
  const avatarLink = document.getElementById("avatarLink");
  const ribbon = document.getElementById("userNameRibbon");
  const yearSpan = document.getElementById("year");

  if (!container) {
    console.warn("Element #tableList not found");
    return;
  }

  let currentProducts = [];

  const renderStars = (rating) => {
    const r = parseFloat(String(rating).replace(",", ".")) || 0;
    let out = "";

    for (let i = 1; i <= 5; i++) {
      if (r >= i) {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
      } else if (r >= i - 0.5) {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hgB${i}" x1="0" x2="1"><stop offset="50%" stop-color="#FFC107"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z" fill="url(#hgB${i})" stroke="#FFC107"/></svg>`;
      } else {
        out += `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFC107" xmlns="http://www.w3.org/2000/svg"><path d="M12 .587l3.668 7.431L23.4 9.748l-5.6 5.458L19.336 24 12 19.897 4.664 24l1.536-8.794L.6 9.748l7.732-1.73L12 .587z"/></svg>`;
      }
    }

    return out;
  };

  const bindBuyButtons = () => {
    document.querySelectorAll(".buy-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.disabled) return;

        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.user_id) {
          window.location.href = "login.html";
          return;
        }

        const productId = button.getAttribute("data-product-id");

        try {
          button.disabled = true;

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
            setTimeout(() => {
              button.disabled = false;
            }, 500);
          } else {
            showPopup(data.error || "Помилка");
            button.disabled = false;
          }
        } catch (err) {
          console.error("Помилка додавання:", err);
          showPopup("Не вдалося додати товар");
          button.disabled = false;
        }
      });
    });
  };

  const renderProducts = (products) => {
    container.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `<p class="text-center">Наразі немає скатертин у наявності</p>`;
      return;
    }

    products.forEach((product) => {
      const photoPath = String(product.Photo || "").split(",")[0]?.trim() || "";

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

    bindBuyButtons();
  };

  if (avatarLink) {
    avatarLink.addEventListener("click", (e) => {
      e.preventDefault();

      let user = null;
      try {
        user = JSON.parse(localStorage.getItem("user"));
      } catch (err) {
        console.warn("Некоректний user у localStorage");
      }

      if (user && typeof user.user_id === "number") {
        window.location.href = user.role === "admin" ? "admin.html" : "account.html";
      } else {
        window.location.href = "register.html";
      }
    });
  }

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (ribbon) {
      if (user && user.name) {
        ribbon.textContent = `Привіт, ${user.name}!`;
      } else {
        ribbon.style.display = "none";
      }
    }
  } catch (err) {
    if (ribbon) ribbon.style.display = "none";
  }

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  try {
    const res = await fetch("http://localhost:5000/products/tag/скатертина");
    const products = await res.json();
    currentProducts = Array.isArray(products) ? products : [];
    renderProducts(currentProducts);
  } catch (error) {
    console.error("Помилка завантаження скатертин:", error);
    container.innerHTML = `<p class="text-center text-danger">Не вдалося завантажити товари</p>`;
  }

  if (sortAscBtn) {
    sortAscBtn.addEventListener("click", () => {
      const sorted = [...currentProducts].sort((a, b) => Number(a.Price) - Number(b.Price));
      renderProducts(sorted);
    });
  }

  if (sortDescBtn) {
    sortDescBtn.addEventListener("click", () => {
      const sorted = [...currentProducts].sort((a, b) => Number(b.Price) - Number(a.Price));
      renderProducts(sorted);
    });
  }
});

function showPopup(message, duration = 2000) {
  const popup = document.getElementById("popup-message");
  if (!popup) return;

  popup.textContent = message;
  popup.style.display = "block";
  popup.style.opacity = "1";

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.style.display = "none";
    }, 300);
  }, duration);
}


