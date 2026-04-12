// 🔑 Запит на логін
async function loginUser(data) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

function validatePassword(password) {
  if (password.length < 6) {
    return 'Пароль має містити щонайменше 6 символів';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Пароль має містити щонайменше одну латинську букву (A-Z або a-z)';
  }
  return null;
}

function validateEmail(email) {
  const emailRegex = /^[\w.-]+@(gmail|outlook|ukr.net|yahoo)\.com$/;
  if (!emailRegex.test(email)) {
    return 'Пошта має бути у форматі: ім\'я@(gmail|outlook|ukr.net|yahoo).com';
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const messageDiv = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;

    // 🔐 Валідація email
    const emailError = validateEmail(email);
    if (emailError) {
      messageDiv.textContent = emailError;
      messageDiv.className = 'text-danger';
      return;
    }

    // 🔐 Валідація пароля
    const passwordError = validatePassword(password);
    if (passwordError) {
      messageDiv.textContent = passwordError;
      messageDiv.className = 'text-danger';
      return;
    }

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