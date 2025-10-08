// 🔑 Логін
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

    const result = await loginUser({ email, password });

    if (result.user && result.user.user_id) {
      localStorage.setItem('user', JSON.stringify({
        user_id: result.user.user_id,
        name: result.user.name
      }));

      messageDiv.textContent = result.message || 'Вхід успішний';
      messageDiv.className = 'text-success';
      form.reset();

      setTimeout(() => {
        window.location.href = 'account.html';
      }, 1500);
    } else {
      messageDiv.textContent = result.error || 'Невірний email або пароль';
      messageDiv.className = 'text-danger';
    }
  });
});