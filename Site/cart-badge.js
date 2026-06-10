(function () {
  const apiRoot = typeof API_BASE !== "undefined" ? API_BASE : "http://localhost:5000";
  const badgeClass = "cart-count-badge";
  const activeClass = "has-cart-count";

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
      return null;
    }
  };

  const ensureStyles = () => {
    if (document.getElementById("cart-badge-styles")) return;

    const style = document.createElement("style");
    style.id = "cart-badge-styles";
    style.textContent = `
      a[href$="Cart.html"] {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 0;
      }

      .user-avatar-wrapper {
        vertical-align: middle;
      }

      .${badgeClass} {
        position: absolute;
        top: -0.45rem;
        right: -0.55rem;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.32rem;
        border-radius: 999px;
        background: #f3d0a3;
        color: #5f2f14;
        border: 2px solid #a0522d;
        box-shadow: 0 0.18rem 0.45rem rgba(95, 47, 20, 0.28);
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1;
        display: none;
        align-items: center;
        justify-content: center;
      }

      .${activeClass} .${badgeClass} {
        display: inline-flex;
      }
    `;
    document.head.appendChild(style);
  };

  const ensureBadges = () => {
    document.querySelectorAll('a[href$="Cart.html"]').forEach((link) => {
      if (link.querySelector(`.${badgeClass}`)) return;

      const badge = document.createElement("span");
      badge.className = badgeClass;
      badge.setAttribute("aria-label", "Кількість товарів у кошику");
      link.appendChild(badge);
    });
  };

  const setCount = (count) => {
    const safeCount = Math.max(0, Number(count) || 0);
    document.querySelectorAll('a[href$="Cart.html"]').forEach((link) => {
      const badge = link.querySelector(`.${badgeClass}`);
      if (!badge) return;

      badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
      link.classList.toggle(activeClass, safeCount > 0);
      link.setAttribute("aria-label", safeCount > 0
        ? `Кошик, ${safeCount} товарів`
        : "Кошик");
    });
  };

  const refreshCartCount = async () => {
    const user = getCurrentUser();
    if (!user || !user.user_id) {
      setCount(0);
      return;
    }

    try {
      const response = await fetch(`${apiRoot}/cart/${user.user_id}?t=${Date.now()}`);
      const items = await response.json();
      const count = Array.isArray(items)
        ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
        : 0;
      setCount(count);
    } catch (error) {
      console.warn("Не вдалося оновити лічильник кошика", error);
    }
  };

  const shouldRefreshAfterFetch = (input, options) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(options?.method || "GET").toUpperCase();

    return url.includes("/cart/quick-add")
      || (url.includes("/cart/") && ["POST", "PUT", "DELETE"].includes(method));
  };

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    if (shouldRefreshAfterFetch(args[0], args[1])) {
      setTimeout(refreshCartCount, 150);
    }

    return response;
  };

  window.refreshCartCount = refreshCartCount;

  document.addEventListener("DOMContentLoaded", () => {
    ensureStyles();
    ensureBadges();
    refreshCartCount();
  });
})();
