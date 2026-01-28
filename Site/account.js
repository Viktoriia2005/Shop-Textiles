document.addEventListener('DOMContentLoaded', async () => {
  const userData = JSON.parse(localStorage.getItem('user'));
  const welcomeText = document.getElementById('welcome');
  const logoutBtn = document.querySelector('.logout');


  if (!userData || !userData.user_id || isNaN(userData.user_id)) {
    window.location.href = 'login.html';
    return;
  }

  try {

    const res = await fetch(`http://localhost:5000/users/${userData.user_id}`);

    if (!res.ok) {
      throw new Error(`Сервер повернув статус ${res.status}`);
    }

    const user = await res.json();


    welcomeText.textContent = `Ласкаво просимо, ${user.Name}!`;
  } catch (err) {
    console.error('❌ Помилка завантаження акаунту:', err);
    welcomeText.textContent = 'Не вдалося завантажити дані акаунту';
    welcomeText.classList.add('text-danger');
  }


  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});