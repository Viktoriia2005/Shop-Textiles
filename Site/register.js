// 🔐 Реєстрація
async function registerUser(data) {
  const res = await fetch(`${API_BASE}/users/register`, {
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
  const form = document.getElementById('registerForm');
  const messageDiv = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
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

    // ✅ додаємо роль user
    const result = await registerUser({ name, email, password, role: 'user' });

    if (result.user && result.user.id) {
      messageDiv.textContent = result.message || 'Реєстрація успішна';
      messageDiv.className = 'text-success';

      localStorage.setItem('user', JSON.stringify({
        user_id: result.user.id,
        name: result.user.name,
        role: 'user'
      }));
      form.reset();

      setTimeout(() => {
        window.location.href = 'account.html';
      }, 1500);
    } else {
      messageDiv.textContent = result.error || 'Помилка реєстрації';
      messageDiv.className = 'text-danger';
    }
  });
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});