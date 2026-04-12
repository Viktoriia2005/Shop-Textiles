document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("favouritesList");
  const emptyState = document.getElementById("noFavourites");
  const errorState = document.getElementById("favouritesError");
  const yearSpan = document.getElementById("year");

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  if (!list) return;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (err) {
      return null;
    }
  })();

  if (!user || !user.user_id) {
    window.location.href = "login.html";
    return;
  }

  const apiRoot = typeof API_BASE !== "undefined" ? API_BASE : "http://localhost:5000";

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

        const productId = button.getAttribute("data-product-id");
        try {
          button.disabled = true;

          const res = await fetch(`${apiRoot}/cart/quick-add`, {
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

  function renderFavourites(products) {
    list.innerHTML = "";

    if (errorState) errorState.classList.add("d-none");

    if (!Array.isArray(products) || products.length === 0) {
      if (emptyState) emptyState.classList.remove("d-none");
      return;
    }

      if (emptyState) emptyState.classList.add("d-none");
      if (errorState) errorState.classList.add("d-none");

    products.forEach((product) => {
      const photoPath = String(product.Photo || "").split(",")[0]?.trim() || "";
      const card = document.createElement("div");
      card.className = "col";
      card.innerHTML = `
        <div class="card h-100 favourites-card">
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
          <button class="wishlist-btn" type="button" data-product-id="${product.product_id}" aria-pressed="true">
            <span class="wishlist-heart liked">❤️</span>
          </button>
          <button class="btn btn-custom btn-sm buy-btn" data-product-id="${product.product_id}">
            Купити
          </button>
        </div>
      `;
      list.appendChild(card);
    });

    bindBuyButtons();
  }

  async function loadFavourites() {
    try {
      const res = await fetch(`${apiRoot}/favourites/${user.user_id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const products = await res.json();
      renderFavourites(Array.isArray(products) ? products : []);
    } catch (err) {
      console.error("Помилка завантаження вподобаних:", err);
      list.innerHTML = "";
      if (emptyState) emptyState.classList.add("d-none");
      if (errorState) errorState.classList.remove("d-none");
    }
  }

  list.addEventListener("click", async (event) => {
    const btn = event.target.closest(".wishlist-btn");
    if (!btn) return;

    const productId = btn.getAttribute("data-product-id");
    try {
      const res = await fetch(`${apiRoot}/favourites/${user.user_id}/${productId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showPopup(data.error || "Не вдалося видалити з вподобаних");
        return;
      }

      const cardCol = btn.closest(".col");
      if (cardCol) cardCol.remove();
      if (!list.querySelector(".col") && emptyState) {
        emptyState.classList.remove("d-none");
      }
    } catch (err) {
      console.error("Помилка видалення з вподобаних:", err);
      showPopup("Не вдалося видалити з вподобаних");
    }
  });

  initializeAvatarAccountLink();
  await loadFavourites();
});

function initializeAvatarAccountLink() {
  const avatarLink = document.getElementById('avatarLink');
  const ribbon = document.getElementById('userNameRibbon');

  if (!avatarLink || !ribbon) return;

  avatarLink.addEventListener('click', (e) => {
    e.preventDefault();

    const rawUser = localStorage.getItem('user');
    let user = null;

    try {
      user = JSON.parse(rawUser);
    } catch (err) {
      console.warn('Некоректний user у localStorage');
    }

    if (user && typeof user.user_id === 'number') {
      window.location.href = 'account.html';
    } else {
      window.location.href = 'register.html';
    }
  });

  const rawUser = localStorage.getItem('user');
  let user = null;

  try {
    user = JSON.parse(rawUser);
  } catch (err) {
    console.warn('Некоректний user у localStorage');
  }

  if (user && user.name) {
    ribbon.textContent = `Привіт, ${user.name}!`;
  } else {
    ribbon.style.display = 'none';
  }
}

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
