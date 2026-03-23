// 🔑 Запит на логін
async function loginUser(data) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const messageDiv = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const result = await loginUser({ email, password });

      if (result.user && result.user.user_id) {
        // Зберігаємо дані користувача у localStorage
        localStorage.setItem('user', JSON.stringify({
          user_id: result.user.user_id,
          name: result.user.name,
          role: result.user.role
        }));

        // Якщо це адмін — зберігаємо його ID окремо
        if (result.user.role === 'admin') {
          localStorage.setItem('adminId', result.user.user_id);
        }

        messageDiv.textContent = result.message || 'Вхід успішний';
        messageDiv.className = 'text-success';
        form.reset();

        // Редірект залежно від ролі
        setTimeout(() => {
          if (result.user.role === 'admin') {
            localStorage.setItem('isAdmin', 'true');   // ✅ зберігаємо прапорець
            window.location.href = 'admin.html';
          } else {
            localStorage.setItem('isAdmin', 'false');
            window.location.href = 'account.html';
          }
        }, 1500);
      } else {
        messageDiv.textContent = result.error || 'Невірний email або пароль';
        messageDiv.className = 'text-danger';
      }
    } catch (err) {
      console.error("❌ Помилка логіну:", err);
      messageDiv.textContent = 'Помилка сервера';
      messageDiv.className = 'text-danger';
    }
  });
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});