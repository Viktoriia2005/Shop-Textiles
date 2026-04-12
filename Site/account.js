document.addEventListener('DOMContentLoaded', async () => {
  const userData = JSON.parse(localStorage.getItem('user'));
  const welcomeText = document.getElementById('welcome');
  const logoutBtn = document.querySelector('.logout');

  // Якщо немає даних користувача → редірект на логін
  if (!userData || !userData.user_id || isNaN(userData.user_id)) {
    window.location.href = 'login.html';
    return;
  }

  // 🚫 Перевірка ролі: якщо адмін → редірект у адмін-панель
  if (userData.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  const apiRoot = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000';

  try {
    const res = await fetch(`${apiRoot}/users/${userData.user_id}`);
    if (!res.ok) throw new Error(`Сервер повернув статус ${res.status}`);
    const user = await res.json();

    welcomeText.textContent = `Ласкаво просимо, ${user.Name}!`;

    // Заповнюємо модальне вікно поточними даними
    document.getElementById("editName").value = user.Name;
    document.getElementById("editEmail").value = user.Email;
  } catch (err) {
    console.error('❌ Помилка завантаження акаунту:', err);
    welcomeText.textContent = 'Не вдалося завантажити дані акаунту';
    welcomeText.classList.add('text-danger');
  }

  // 🚪 Вихід
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    localStorage.removeItem('adminId');
    localStorage.removeItem('isAdmin');
    window.location.href = 'login.html';
  });

  // 📌 Обробка форми модального вікна
  const personalDataForm = document.getElementById("personalDataForm");
  personalDataForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const updatedData = {
      name: document.getElementById("editName").value.trim(),
      email: document.getElementById("editEmail").value.trim()
    };

    try {
      const res = await fetch(`${apiRoot}/users/${userData.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error(`Сервер повернув статус ${res.status}`);

      // show temporary popup message instead of alert
      showFlashMessage("Дані збережено!");
      // Оновлюємо локальні дані
      userData.name = updatedData.name;
      userData.email = updatedData.email;
      localStorage.setItem("user", JSON.stringify(userData));
      welcomeText.textContent = `Ласкаво просимо, ${updatedData.name}!`;

      // Закриваємо модальне вікно
      const modal = bootstrap.Modal.getInstance(document.getElementById("personalDataModal"));
      modal.hide();
    } catch (err) {
      console.error("❌ Помилка оновлення даних:", err);
      alert("Не вдалося оновити дані");
    }
  });

  // функція для показу тимчасового повідомлення (popup)
  function showFlashMessage(msg, duration = 3000) {
    const popup = document.getElementById('popup-message');
    popup.textContent = msg;
    popup.style.display = 'block';
    // force reflow to allow transition
    // eslint-disable-next-line no-unused-expressions
    popup.offsetWidth;
    popup.style.opacity = '1';
    setTimeout(() => {
      popup.style.opacity = '0';
      popup.addEventListener('transitionend', function handler() {
        popup.style.display = 'none';
        popup.removeEventListener('transitionend', handler);
      });
    }, duration);
  }

  // 📌 Відкриття модального вікна при кліку на «Персональні дані»
  const personalDataLink = document.getElementById("personalDataLink");
  if (personalDataLink) {
    personalDataLink.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("personalDataModal"));
      modal.show();
    });
  }

  const openPasswordModalBtn = document.getElementById("openPasswordModal");
  if (openPasswordModalBtn) {
    openPasswordModalBtn.addEventListener("click", () => {
      const personalModalEl = document.getElementById("personalDataModal");
      const personalModal = bootstrap.Modal.getInstance(personalModalEl);
      if (personalModal) personalModal.hide();
      const passModal = new bootstrap.Modal(document.getElementById("passwordModal"));
      passModal.show();
    });
  }

  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword").value.trim();
      const newPassword = document.getElementById("newPassword").value.trim();

      if (newPassword.length < 6) {
        showFlashMessage("Пароль має містити щонайменше 6 символів");
        return;
      }      if (!/[a-zA-Z]/.test(newPassword)) {
        showFlashMessage('Пароль має містити щонайменше одну латинську букву (A-Z або a-z)');
        return;
      }
      try {
        const res = await fetch(`${apiRoot}/users/${userData.user_id}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error || "Не вдалося оновити пароль";
          throw new Error(msg);
        }

        showFlashMessage("Пароль успішно оновлено!");
        passwordForm.reset();

        const passModalEl = document.getElementById("passwordModal");
        const passModal = bootstrap.Modal.getInstance(passModalEl);
        if (passModal) passModal.hide();
      } catch (err) {
        console.error("❌ Помилка оновлення пароля:", err);
        showFlashMessage(err.message || "Не вдалося оновити пароль");
      }
    });
  }

  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Сховати" : "Показати";
    });
  });

  await loadAccountSliders(userData, apiRoot);

  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

async function loadAccountSliders(userData, apiRoot) {
  const orderedTrack = document.getElementById('orderedSliderTrack');
  const favouriteTrack = document.getElementById('favouriteSliderTrack');
  const orderedEmpty = document.getElementById('orderedEmpty');
  const favouriteEmpty = document.getElementById('favouriteEmpty');
  const sliderButtons = document.querySelectorAll('.slider-btn');

  if (!orderedTrack || !favouriteTrack || !orderedEmpty || !favouriteEmpty) return;

  const [orderItems, favouriteItems] = await Promise.all([
    fetchLatestOrderedItems(userData, apiRoot),
    fetchFavouriteItems(userData, apiRoot)
  ]);

  renderSliderItems(orderItems, orderedTrack, orderedEmpty);
  renderSliderItems(favouriteItems, favouriteTrack, favouriteEmpty);

  sliderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const direction = button.getAttribute('data-direction');
      const track = document.getElementById(targetId);
      if (!track) return;
      const offset = direction === 'left' ? -track.clientWidth / 1.8 : track.clientWidth / 1.8;
      track.scrollBy({ left: offset, behavior: 'smooth' });
    });
  });
}

function renderSliderItems(items, track, emptyMessage) {
  track.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';
  track.innerHTML = items.map((item) => {
    const photo = String(item.Photo || item.photo || '').split(',')[0]?.trim() || 'img/Icon_Shop.png';
    const title = item.Name || item.name || item.title || 'Товар';
    return `
      <div class="slider-card">
        <img src="${photo}" alt="${title}">
        <div class="slider-card-title">${title}</div>
      </div>
    `;
  }).join('');
}

async function fetchLatestOrderedItems(userData, apiRoot) {
  try {
    const res = await fetch(`${apiRoot}/orders/user/${userData.user_id}/full?t=${Date.now()}`);
    if (!res.ok) return [];
    const orders = await res.json();
    if (!Array.isArray(orders)) return [];

    const itemsMap = new Map();
    const sortedOrders = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    sortedOrders.forEach((order) => {
      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        const id = item.product_id || item.id || item.productId;
        if (!id || itemsMap.has(id)) return;
        itemsMap.set(id, item);
      });
    });

    return [...itemsMap.values()].slice(0, 7);
  } catch (err) {
    console.warn('Помилка завантаження замовлених товарів:', err);
    return [];
  }
}

async function fetchFavouriteItems(userData, apiRoot) {
  try {
    const res = await fetch(`${apiRoot}/favourites/${userData.user_id}`);
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items.slice(0, 7);
  } catch (err) {
    console.warn('Помилка завантаження вподобаних товарів:', err);
    return [];
  }
}
