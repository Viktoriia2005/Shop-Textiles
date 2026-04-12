document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("blanketList");
  const sortAscBtn = document.getElementById("sortAsc");
  const sortDescBtn = document.getElementById("sortDesc");
  const avatarLink = document.getElementById("avatarLink");
  const ribbon = document.getElementById("userNameRibbon");
  const yearSpan = document.getElementById("year");

  if (!container) {
    console.warn("Element #blanketList not found");
    return;
  }

  let currentProducts = [];
  let currentPage = 1;
  const limit = 6;

  const apiRoot = typeof API_BASE !== "undefined" ? API_BASE : "http://localhost:5000";
  let favouritesSet = new Set();

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (err) {
      return null;
    }
  };

  const loadFavourites = async () => {
    const user = getCurrentUser();
    if (!user || !user.user_id) {
      favouritesSet = new Set();
      return;
    }

    try {
      const res = await fetch(`${apiRoot}/favourites/${user.user_id}/ids`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ids = await res.json();
      favouritesSet = new Set((Array.isArray(ids) ? ids : []).map(Number));
    } catch (err) {
      console.warn("Failed to load favourites", err);
      favouritesSet = new Set();
    }
  };

  const isFavourite = (productId) => favouritesSet.has(Number(productId));

  const updateFavouriteButton = (btn, liked) => {
    const heart = btn.querySelector(".wishlist-heart");
    if (!heart) return;
    heart.classList.toggle("liked", liked);
    heart.classList.toggle("unliked", !liked);
    heart.textContent = liked ? "❤️" : "💔";
    btn.setAttribute("aria-pressed", String(liked));
    if (liked) {
      heart.classList.remove("pulse-heart");
      // restart animation
      void heart.offsetWidth;
      heart.classList.add("pulse-heart");
      setTimeout(() => heart.classList.remove("pulse-heart"), 600);
    }
  };

  const toggleFavourite = async (productId, btn) => {
    const user = getCurrentUser();
    if (!user || !user.user_id) {
      window.location.href = "login.html";
      return;
    }

    const idNum = Number(productId);
    const liked = favouritesSet.has(idNum);

    try {
      if (liked) {
        const res = await fetch(`${apiRoot}/favourites/${user.user_id}/${idNum}`, { method: "DELETE" });
        if (!res.ok) throw new Error("remove");
        favouritesSet.delete(idNum);
        updateFavouriteButton(btn, false);
      } else {
        const res = await fetch(`${apiRoot}/favourites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.user_id, product_id: idNum })
        });
        if (!res.ok) throw new Error("add");
        favouritesSet.add(idNum);
        updateFavouriteButton(btn, true);
      }
    } catch (err) {
      console.error("Failed to update favourites:", err);
      if (typeof showPopup === "function") showPopup("Не вдалося оновити вподобані");
    }
  };

  let paginationWrapper = (container.parentElement && container.parentElement.querySelector(".pagination-wrapper")) || document.getElementById("paginationWrapper");
  if (!paginationWrapper) {
    paginationWrapper = document.createElement("div");
    paginationWrapper.className = "pagination-wrapper mt-4 d-flex justify-content-center flex-wrap";
    const paginationHost = container.parentElement || document.body;
    paginationHost.appendChild(paginationWrapper);
  }

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
  }

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".wishlist-btn");
    if (!btn) return;
    e.preventDefault();
    const productId = btn.getAttribute("data-product-id");
    toggleFavourite(productId, btn);
  });

  const renderProducts = (products, page = 1) => {
    container.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `<p class="text-center">Наразі немає ковдр у наявності</p>`;
      paginationWrapper.innerHTML = "";
      return;
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedProducts = products.slice(start, end);

    paginatedProducts.forEach((product) => {
      const photoPath = String(product.Photo || "").split(",")[0]?.trim() || "";
      const liked = isFavourite(product.product_id);
      const heartClass = liked ? "liked" : "unliked";
      const heartIcon = liked ? "❤️" : "💔";

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
          <button class="wishlist-btn" type="button" data-product-id="${product.product_id}" aria-pressed="${liked}">
            <span class="wishlist-heart ${heartClass}">${heartIcon}</span>
          </button>
          <button class="btn btn-custom btn-sm buy-btn" data-product-id="${product.product_id}">
            Купити
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    bindBuyButtons();
    renderPagination(products.length, page);
  };

  const renderPagination = (totalItems, page) => {
    const totalPages = Math.ceil(totalItems / limit);
    paginationWrapper.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-link btn ${i === page ? "btn-primary" : "btn-light"} mx-1`;
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => {
        currentPage = i;
        renderProducts(currentProducts, currentPage);
      });
      paginationWrapper.appendChild(pageBtn);
    }
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
    const res = await fetch("http://localhost:5000/products/tag/Ковдра");
    const products = await res.json();
    currentProducts = Array.isArray(products) ? products : [];
    currentPage = 1;
    await loadFavourites();
    renderProducts(currentProducts, currentPage);
  } catch (error) {
    console.error("Помилка завантаження ковдр:", error);
    container.innerHTML = `<p class="text-center text-danger">Не вдалося завантажити товари</p>`;
  }

  if (sortAscBtn) {
    sortAscBtn.addEventListener("click", () => {
      currentProducts = [...currentProducts].sort((a, b) => Number(a.Price) - Number(b.Price));
      currentPage = 1;
      renderProducts(currentProducts, currentPage);
    });
  }

  if (sortDescBtn) {
    sortDescBtn.addEventListener("click", () => {
      currentProducts = [...currentProducts].sort((a, b) => Number(b.Price) - Number(a.Price));
      currentPage = 1;
      renderProducts(currentProducts, currentPage);
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

