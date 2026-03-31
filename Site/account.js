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

  try {
    const res = await fetch(`http://localhost:5000/users/${userData.user_id}`);
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
      const res = await fetch(`http://localhost:5000/users/${userData.user_id}`, {
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
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});